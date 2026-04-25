import * as z from 'zod';
import { produce, type Immutable, freeze } from 'immer';
import { Assert, AssertNotNullable, CloneDeepMutable } from '../../utility/misc.ts';
import type { Logger } from '../../logging/logger.ts';

import type { AppearanceActionContext } from '../actionLogic/index.ts';
import type { IItemLoadContext } from '../../assets/index.ts';
import type { CharacterRestrictionsManager } from '../../character/index.ts';
import type { KeySetup, KeyDataBundle } from './index.ts';

export const KeyActionSchema = z.discriminatedUnion('action', [
	z.object({
		action: z.literal('showBitting'),
	}),
	z.object({
		action: z.literal('updateBitting'),
		bittingString: z.string().optional(),
	}),
]);
export type KeyAction = z.infer<typeof KeyActionSchema>;

export const BITTING_LENGTH: number = 8;

export type KeyActionShowBittingProblem = 'blockSelf' | 'notAllowed';
export type KeyActionUpdateBittingProblem = 'blockSelf' | 'notAllowed' | 'invalidBitting';

export type KeyActionProblem = KeyActionShowBittingProblem | KeyActionUpdateBittingProblem;

export type KeyActionShowBittingResult = {
	result: 'ok';
	bitting: string | null;
} | {
	result: 'failed';
	reason: KeyActionShowBittingProblem;
} | {
	result: 'invalid';
};

export type KeyActionUpdateBittingResult = {
	result: 'ok';
	newState: KeyLogic;
} | {
	result: 'failed';
	reason: KeyActionUpdateBittingProblem;
} | {
	result: 'invalid';
};

export interface KeyActionContext {
	/** The character doing the action. */
	player: CharacterRestrictionsManager;
	/** Whether the character doing the action is targeting a item somewhere on themselves. */
	isSelfAction: boolean;
	/** In which context is the action being executed. */
	executionContext: AppearanceActionContext['executionContext'];
}

export class KeyLogic {
	public readonly keySetup: Immutable<KeySetup>;
	public readonly keyData: Immutable<KeyDataBundle>;

	protected constructor(keyConfig: Immutable<KeySetup>, keyData: Immutable<KeyDataBundle>) {
		this.keySetup = keyConfig;
		this.keyData = keyData;
	}

	public get hasBitting(): boolean {
		switch (this.keyData.bitting?.side) {
			case 'client':
				return this.keyData.bitting.hasBitting ?? false;
			case 'server':
				return this.keyData.bitting != null;
			default:
				return false;
		}
	}

	public get exportToClientBundle(): KeyDataBundle {
		if (this.keyData.bitting?.side === 'server') {
			return {
				...this.keyData,
				bitting: {
					side: 'client',
					hasBitting: this.keyData.bitting.keyBitting ? true : undefined,
				},
			};
		}
		return this.keyData;
	}

	public get exportToServerBundle(): KeyDataBundle {
		return this.keyData;
	}

	public get isConfigured(): boolean {
		return this.keyData.bitting === undefined;
	}

	public showBitting({ player, isSelfAction }: KeyActionContext): KeyActionShowBittingResult {
		if (!this.isConfigured) {
			return { result: 'invalid' };
		}

		// Locks can prevent interaction from player (unless in force-allow is enabled)
		if (isSelfAction && !player.forceAllowItemActions()) {
			return {
				result: 'failed',
				reason: 'blockSelf',
			};
		}

		if (this.keyData.bitting?.side !== 'server') {
			// Partial success on client side - checks pass, but there is no password to show
			return {
				result: 'ok',
				bitting: null,
			};
		}

		AssertNotNullable(this.keyData.bitting.keyBitting);

		if (this.keyData.data == null || this.keyData.data.id !== player.appearance.id) {
			return {
				result: 'failed',
				reason: 'notAllowed',
			};
		}

		return {
			result: 'ok',
			bitting: this.keyData.bitting.keyBitting ?? null,
		};
	}

	public updateBitting({ player, isSelfAction }: KeyActionContext, { bittingString }: Extract<KeyAction, { action: 'updateBitting'; }>): KeyActionUpdateBittingResult {
		if (this.keyData.bitting?.side !== 'server') {
			return {
				result: 'invalid',
			};
		}

		// Locks can prevent interaction from player (unless in force-allow is enabled)
		if (isSelfAction && !player.forceAllowItemActions()) {
			return {
				result: 'failed',
				reason: 'blockSelf',
			};
		}

		if (this.keyData.data == null || !this.isConfigured && this.keyData.data.id === player.appearance.id) {
			return {
				result: 'failed',
				reason: 'notAllowed',
			};
		}

		if (!KeyLogic.validateBitting(bittingString)) {
			return {
				result: 'failed',
				reason: 'invalidBitting',
			};
		}

		const keyData: Immutable<KeyDataBundle> = produce(this.keyData, ((data) => {
			data.bitting = {
				side: 'server',
				keyBitting: bittingString,
			};
			data.bitting = {
				side: 'client',
				hasBitting: bittingString !== '',
			};
		}));

		return {
			result: 'ok',
			newState: new KeyLogic(this.keySetup, keyData),
		};
	}

	public static loadFromBundle(
		keySetup: Immutable<KeySetup>,
		bundle: Immutable<KeyDataBundle> | null,
		{ doLoadTimeCleanup, logger }: Pick<IItemLoadContext, 'doLoadTimeCleanup' | 'logger'>,
	): KeyLogic {
		freeze(keySetup, true);
		freeze(bundle, true);
		// Load-time cleanup logic
		if (doLoadTimeCleanup && bundle?.bitting != null) {
			const keyData = CloneDeepMutable(bundle);
			Assert(keyData?.bitting != null);
			switch (keyData.bitting.side) {
				case 'server':
					// Remove password if it got invalid
					if (keyData.bitting.keyBitting != null && !KeyLogic.validateBitting(keyData.bitting.keyBitting)) {
						logger?.warning(`Key bitting has become invalid removing it.`);
						delete keyData.bitting.keyBitting;
					}
					break;
			}

			bundle = freeze(keyData, true);
		}

		return new KeyLogic(keySetup, bundle ?? {});
	}

	public static validateBitting(bitting?: string, logger?: Logger): boolean {
		if (bitting === undefined || bitting === null) {
			return false;
		}
		if (/[^0-9]/.exec(bitting)) {
			logger?.warning(`has a bitting(s) that is not valid`);
			return false;
		}
		// All keys are a Fixed Length for now!
		if (bitting.length !== 8) {
			logger?.warning(`has a hidden password longer than the asset's password length`);
			return false;
		}
		return true;
	}
}
