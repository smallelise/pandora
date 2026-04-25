import classNames from 'classnames';
import { ItemModuleKey } from 'pandora-common/assets/modules/key';
import { type ActionTargetSelector, type AppearanceAction, type ItemPath } from 'pandora-common';
import { ReactElement, useCallback, useMemo } from 'react';
import { Column, Row } from '../../common/container/container.tsx';
import { WardrobeKeyLogicExecuteButtonProps, WardrobeKeyLogicUnconfigured } from '../views/wardrobeKeyLogic.tsx';
import type { WardrobeExecuteCheckedResult } from '../wardrobeActionContext.tsx';
import { WardrobeActionButton } from '../wardrobeComponents.tsx';
import { WardrobeModuleProps, WardrobeModuleTemplateProps } from '../wardrobeTypes.ts';

export function WardrobeModuleConfigKey({ target, item, moduleName, m }: WardrobeModuleProps<ItemModuleKey>): ReactElement {
	return (
		<Column padding='medium'>
			<Row padding='medium' wrap>
				<Row padding='medium' alignY='center'>
					<span>
						{ m.config.name } (Unconfigured)
					</span>
				</Row>
			</Row>
			<Row padding='medium' alignY='center'>
				<WardrobeKeyUnconfigure target={ target } item={ item } moduleName={ moduleName } m={ m } />
			</Row>
		</Column>
	);
}

export function WardrobeModuleTemplateConfigKey({ template }: WardrobeModuleTemplateProps<'key'>): ReactElement {

	return (
		<Column padding='medium'>
			<Row padding='medium' wrap>
				<Row padding='medium' alignY='center'>
					<span>
						Key (Unconfigured)
					</span>
				</Row>
			</Row>
		</Column>
	);
}

function WardrobeKeyUnconfigure({ target, item, moduleName, m }: Omit<WardrobeModuleProps<ItemModuleKey>, 'setFocus'>): ReactElement | null {
	const actionContext = useMemo((): WardrobeKeyActionButtonContext => ({
		target,
		item,
		moduleName,
	}), [target, item, moduleName]);

	return (
		<WardrobeKeyLogicUnconfigured
			keyLogic={ m.keyLogic }
			ActionButton={ WardrobeKeyActionButton }
			actionContext={ actionContext }
		/>
	);
}

interface WardrobeKeyActionButtonContext {
	target: ActionTargetSelector;
	item: ItemPath;
	moduleName: string;
}

function WardrobeKeyActionButton({ disabled, onFailure, keyAction, onCurrentlyAttempting, children, actionContext, onExecute, slim, iconButton }: WardrobeKeyLogicExecuteButtonProps<WardrobeKeyActionButtonContext>) {
	const { target, item, moduleName } = actionContext;

	const action = useMemo((): AppearanceAction => ({
		type: 'moduleAction',
		target,
		item,
		module: moduleName,
		action: {
			moduleType: 'key',
			keyAction,
		},
	}), [keyAction, item, moduleName, target]);

	const onCurrentAttempt = useCallback((currentAttempt: WardrobeExecuteCheckedResult['currentAttempt']): void => {
		onCurrentlyAttempting?.(currentAttempt != null);
	}, [onCurrentlyAttempting]);

	return (
		<WardrobeActionButton
			disabled={ disabled }
			onFailure={ onFailure }
			action={ action }
			onCurrentAttempt={ onCurrentAttempt }
			onExecute={ onExecute }
			className={ classNames(
                slim ? 'slim' : null,
                iconButton ? 'IconButton' : null,
			) }
		>
			{ children }
		</WardrobeActionButton>
	);
}
