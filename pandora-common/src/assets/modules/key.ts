import * as z from 'zod';
import { Immutable } from 'immer';
import { Satisfies } from '../../utility/misc.ts';

import { ItemInteractionType } from '../../character/restrictionTypes.ts';
import type { InteractionId, AppearanceModuleActionContext } from '../../gameLogic/index.ts';
import type { AppearanceValidationResult } from '../appearanceValidation.ts';
import type { Asset } from '../asset.ts';
import type { AppearanceItems } from '../item/index.ts';
import type { AssetManager } from '../assetManager.ts';
import type { ConditionEqOperator } from '../graphics/index.ts';
import type { IItemCreationContext, IItemLoadContext, IItemValidationContext } from '../item/base.ts';
import type { IAssetModuleDefinition, IExportOptions, IItemModule, IModuleActionCommon, IModuleConfigCommon, IModuleItemDataCommon } from './common.ts';

import { KeyActionSchema, KeyDataBundleSchema, KeyDataBundle, KeySetup, KeyLogic } from '../../gameLogic/keys/index.ts';

export type IModuleConfigKey<TProperties, TStaticData> = IModuleConfigCommon<'key', TProperties, TStaticData> & KeySetup;
export const ModuleItemDataKeySchema = z.object({
	type: z.literal('key'),
	keyData: KeyDataBundleSchema.nullable(),
});
export type IModuleItemDataKey = Satisfies<z.infer<typeof ModuleItemDataKeySchema>, IModuleItemDataCommon<'key'>>;

export const ModuleItemTemplateKeySchema = z.object({
	type: z.literal('key'),
	keyData: KeyDataBundleSchema.nullable(),
});
export type IModuleItemTemplateKey = z.infer<typeof ModuleItemTemplateKeySchema>;

export const ItemModuleKeyActionSchema = z.object({
	moduleType: z.literal('key'),
	keyAction: z.lazy(() => KeyActionSchema),
});
export type ItemModuleKeyAction = Satisfies<z.infer<typeof ItemModuleKeyActionSchema>, IModuleActionCommon<'key'>>;

export class KeyModuleDefinition implements IAssetModuleDefinition<'key'> {

	public makeDefaultData<TProperties, TStaticData>(_config: Immutable<IModuleConfigKey<TProperties, TStaticData>>): IModuleItemDataKey {
		return {
			type: 'key',
			keyData: null,
		};
	}

	public makeDataFromTemplate<TProperties, TStaticData>(_config: Immutable<IModuleConfigKey<TProperties, TStaticData>>, template: IModuleItemTemplateKey, _context: IItemCreationContext): IModuleItemDataKey {
		return {
			type: 'key',
			keyData: template.keyData,
		};
	}

	public loadModule<TProperties, TStaticData>(config: Immutable<IModuleConfigKey<TProperties, TStaticData>>, data: IModuleItemDataKey, context: IItemLoadContext): ItemModuleKey<TProperties, TStaticData> {
		return ItemModuleKey.loadFromData<TProperties, TStaticData>(config, data, context);
	}

	public getStaticAttributes<TProperties, TStaticData>(_config: Immutable<IModuleConfigKey<TProperties, TStaticData>>): ReadonlySet<string> {
		return new Set<string>();
	}
}

interface ItemModuleKeyProps<TProperties, TStaticData> {
	readonly assetManager: AssetManager;
	readonly config: Immutable<IModuleConfigKey<TProperties, TStaticData>>;
	readonly keyLogic: KeyLogic;
}

export class ItemModuleKey<TProperties = unknown, TStaticData = unknown> implements IItemModule<TProperties, TStaticData, 'key'>, ItemModuleKeyProps<TProperties, TStaticData> {
	public readonly type = 'key';

	public readonly assetManager: AssetManager;
	public readonly config: Immutable<IModuleConfigKey<TProperties, TStaticData>>;
	public readonly keyLogic: KeyLogic;

	public get interactionType(): ItemInteractionType {
		return ItemInteractionType.MODIFY;
	}

	//TODO: Add Extra InteractionId? (Disallow key change to Offline Players by default + Add Modifier to change that behavior)
	public readonly interactionId: InteractionId = 'interact';

	protected constructor(props: ItemModuleKeyProps<TProperties, TStaticData>, overrideProps?: Partial<ItemModuleKeyProps<TProperties, TStaticData>>) {
		this.assetManager = overrideProps?.assetManager ?? props.assetManager;
		this.config = overrideProps?.config ?? props.config;
		this.keyLogic = overrideProps?.keyLogic ?? props.keyLogic;
	}

	protected withProps(overrideProps: Partial<ItemModuleKeyProps<TProperties, TStaticData>>): ItemModuleKey<TProperties, TStaticData> {
		return new ItemModuleKey(this, overrideProps);
	}

	public static loadFromData<TProperties, TStaticData>(config: Immutable<IModuleConfigKey<TProperties, TStaticData>>, data: IModuleItemDataKey, context: IItemLoadContext): ItemModuleKey<TProperties, TStaticData> {
		const keyLogic = KeyLogic.loadFromBundle(
			config,
			data.keyData,
			{
				...context,
				logger: context.logger?.prefixMessages(`Key:`),
			});

		return new ItemModuleKey({
			assetManager: context.assetManager,
			config,
			keyLogic,
		});
	}

	public exportToTemplate(): IModuleItemTemplateKey {
		return {
			type: 'key',
			keyData: this.keyLogic.exportToClientBundle,
		};
	}

	public exportData(options: IExportOptions): IModuleItemDataKey {
		if (options.clientOnly) {
			let clientOnlyData: KeyDataBundle;

			if (this.keyLogic.keyData.bitting?.side === 'client') {
				clientOnlyData = {
					bitting: this.keyLogic.keyData.bitting,
					data: this.keyLogic.keyData.data,
				};

				return {
					type: 'key',
					keyData: clientOnlyData,
				};
			}
		}

		return {
			type: 'key',
			keyData: this.keyLogic.keyData,
		};
	}

	public validate(_context: IItemValidationContext, _asset: Asset): AppearanceValidationResult {
		return {
			success: true,
		};
	}

	public getProperties(): Immutable<TProperties>[] {
		return [];
	}

	public doAction(_context: AppearanceModuleActionContext, _action: ItemModuleKeyAction): ItemModuleKey<TProperties, TStaticData> | null {
		return null;
	}

	public evalCondition(_operator: ConditionEqOperator, _value: string): boolean {
		return false;
	}

	public readonly contentsPhysicallyEquipped: boolean = false;

	public getContents(): AppearanceItems {
		return [];
	}

	public setContents(_items: AppearanceItems): ItemModuleKey<TProperties, TStaticData> | null {
		return null;
	}
}
