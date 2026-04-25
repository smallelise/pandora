import {
	Assert,
	FormatTimeInterval,
	MessageSubstitute,
	KeyAction,
	KeyLogic,
	type AppearanceActionData,
	BITTING_LENGTH,
} from 'pandora-common';
import React, { useCallback, useId, useMemo, useState, type ReactElement } from 'react';
import { useCharacterRestrictionManager } from '../../../character/character.ts';
import type { ChildrenProps } from '../../../common/reactTypes.ts';
import { useCurrentTime } from '../../../common/useCurrentTime.ts';
import { Checkbox } from '../../../common/userInteraction/checkbox.tsx';
import { TextInput } from '../../../common/userInteraction/input/textInput.tsx';
import { Column, Row } from '../../common/container/container.tsx';
import { usePlayerState } from '../../gameContext/playerContextProvider.tsx';
import { useWardrobeActionContext } from '../wardrobeActionContext.tsx';

export interface WardrobeKeyLogicExecuteButtonProps<TActionContext> extends ChildrenProps {
	disabled: boolean;
	onFailure?: () => void;
	onExecute?: (data: readonly AppearanceActionData[]) => void;
	keyAction: KeyAction;
	onCurrentlyAttempting?: (attempting: boolean) => void;
	actionContext: TActionContext;
	iconButton?: boolean;
	slim?: boolean;
}

export interface WardrobeKeyLogicProps<TActionContext> {
	keyLogic: KeyLogic;
	// eslint-disable-next-line @typescript-eslint/naming-convention
	ActionButton: React.FC<WardrobeKeyLogicExecuteButtonProps<TActionContext>>;
	actionContext: TActionContext;
}

export interface WardrobeKeyLogicLockedProps<TActionContext> extends WardrobeKeyLogicProps<TActionContext> {
	createdText?: string;
}

function BittingInput<TActionContext>({
	ActionButton,
	actionContext,
	value,
	onChange,
	pendingAttempt = false,
	showInvalidWarning,
	disabled,
}: Pick<WardrobeKeyLogicProps<TActionContext>, 'ActionButton' | 'actionContext'> & {
	value: string;
	onChange: (newValue: string) => void;
	pendingAttempt?: boolean;
	showInvalidWarning?: boolean;
	disabled?: boolean;
}) {
	const id = useId();

	const [inputCharacterType, replaceFunc] = useMemo(() => {
		const ict = 'digits';
		const rf = (v: string) => v.replace(/[^0-9]/g, '');

		return [ict, rf];
	}, []);

	const onInput = useCallback((newValue: string) => {
		onChange(replaceFunc(newValue));
	}, [onChange, replaceFunc]);

	const error = useMemo(() => {
		if (disabled)
			return null;

		if (value.length === BITTING_LENGTH)
			return `Must be ${BITTING_LENGTH} ${inputCharacterType}`;
		if (showInvalidWarning)
			return 'Invalid password';

		return null;
	}, [disabled, value, showInvalidWarning, inputCharacterType]);

	const showBittingAction = useMemo((): KeyAction => ({
		action: 'showBitting',
	}), []);

	const onBittingShown = useCallback((data: readonly AppearanceActionData[]) => {
		for (const d of data) {
			if (d.type === 'moduleActionData' && d.data.moduleAction === 'showPassword') {
				onChange(d.data.password);
				break;
			}
		}
	}, [onChange]);

	return (
		<>
			<Row className='WardrobeInputRow'>
				<label htmlFor={ id }>
					Password
				</label>
				<ActionButton
					keyAction={ showBittingAction }
					onExecute={ onBittingShown }
					disabled={ pendingAttempt }
					actionContext={ actionContext }
				>
					Show
				</ActionButton>
				<TextInput
					id={ id }
					value={ pendingAttempt ? '\u2022'.repeat(Math.min(BITTING_LENGTH, 16)) : value }
					maxLength={ BITTING_LENGTH }
					onChange={ onInput }
					disabled={ disabled || pendingAttempt }
				/>
			</Row>
			{
                (error && !pendingAttempt) ? (
                    <Row className='WardrobeInputRow'>
                    	<span className='error'>{ error }</span>
                    </Row>
                ) : null
			}
		</>
	);
}

export function WardrobeKeyLogicUnconfigured<TActionContext>({ keyLogic, ActionButton, createdText, actionContext }: WardrobeKeyLogicLockedProps<TActionContext>): ReactElement | null {
	const { actions } = useWardrobeActionContext();
	const { player, globalState } = usePlayerState();
	const playerRestrictionManager = useCharacterRestrictionManager(player, globalState, actions.spaceContext);

	const now = useCurrentTime();
	const lockedTextFinal = useMemo(() => {
		const key = keyLogic;
		Assert(key != null && key.keyData.data != null);
		const formatText = createdText ?? 'Created by CHARACTER at TIME';
		if (formatText.length === 0)
			return null;

		const { name, id, time } = key.keyData.data;

		const substitutes = {
			CHARACTER_NAME: name,
			CHARACTER_ID: id,
			CHARACTER: `${name} (${id})`,
			TIME_PASSED: FormatTimeInterval(now - time),
			TIME: new Date(time).toLocaleString(),
		};
		return (
			<Row padding='medium' alignY='start'>
				{ MessageSubstitute(formatText, substitutes) }
			</Row>
		);
	}, [keyLogic, createdText, now]);

	const [bitting, setBitting] = useState<string>('');
	const [invalidPassword, setInvalidBitting] = useState<string | undefined>(undefined);
	const [clearLastPassword, setClearLastPassword] = useState(false);

	// Attempted action for locking or unlocking the lock
	const [currentlyAttempting, setCurrentlyAttempting] = useState<boolean>(false);

	const allowExecute =
		playerRestrictionManager.forceAllowItemActions() ||
        KeyLogic.validateBitting(bitting);

	const action = useMemo((): KeyAction => ({
		action: 'updateBitting',
		bittingString: currentlyAttempting ? undefined : bitting,
	}), [currentlyAttempting, bitting]);

	return (
		<>
			{ lockedTextFinal }
			<Column className='WardrobeLockPassword'>
				<Row className='WardrobeInputRow'>
					<label>Remove password</label>
					<Checkbox checked={ clearLastPassword } onChange={ setClearLastPassword } />
				</Row>
				<BittingInput
					value={ bitting }
					onChange={ setBitting }
					showInvalidWarning={ bitting === invalidPassword }
					pendingAttempt={ currentlyAttempting }
					ActionButton={ ActionButton }
					actionContext={ actionContext }
				/>
			</Column>
			<ActionButton
				disabled={ !allowExecute && !currentlyAttempting }
				onFailure={ () => setInvalidBitting(bitting) }
				keyAction={ action }
				onCurrentlyAttempting={ setCurrentlyAttempting }
				actionContext={ actionContext }
			>
				Unlock
			</ActionButton>
		</>
	);
}

