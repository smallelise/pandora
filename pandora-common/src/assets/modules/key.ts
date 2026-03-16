import { IAssetModuleDefinition, IExportOptions, IItemModule, IModuleActionCommon, IModuleConfigCommon, IModuleItemDataCommon } from './common.ts';
import { z } from 'zod';
import { AssetManager } from '../assetManager.ts';
import { Immutable } from 'immer';
import type { AppearanceItems, IItemCreationContext, IItemLoadContext, IItemValidationContext } from '../item/index.ts';
import { AppearanceModuleActionContext, InteractionId } from '../../gameLogic/index.ts';
import { ItemInteractionType } from '../../character/index.ts';
import { ConditionEqOperator } from '../graphics/index.ts';
import { Asset } from '../asset.ts';
import { AppearanceValidationResult } from '../appearanceValidation.ts';
import { Satisfies } from '../../utility/index.ts';
import { __internal_ItemBundleSchemaRecursive, __internal_ItemTemplateSchemaRecursive } from "../item/_internalRecursion.ts";

export type IModuleConfigKey<TProperties, TStaticData> = IModuleConfigCommon<'key', TProperties, TStaticData> & {
	shapePinning?: number[];
};

export const ModuleItemDataKeySchema = z.object({
	type: z.literal('key'),
	contents: z.array(__internal_ItemBundleSchemaRecursive),
});
export type IModuleItemDataKey = Satisfies<z.infer<typeof ModuleItemDataKeySchema>, IModuleItemDataCommon<'key'>>;

export const ModuleItemTemplateKeySchema = z.object({
	type: z.literal('key'),
	contents: z.array(__internal_ItemTemplateSchemaRecursive),
});
export type IModuleItemTemplateKey = z.infer<typeof ModuleItemTemplateKeySchema>;

export const ItemModuleKeyActionSchema = z.object({
	moduleType: z.literal('key'),
});
export type ItemModuleKeyAction = Satisfies<z.infer<typeof ItemModuleKeyActionSchema>, IModuleActionCommon<'key'>>;

export class KeyModuleDefinition implements IAssetModuleDefinition<'key'> {

	public makeDefaultData<TProperties, TStaticData>(_config: Immutable<IModuleConfigKey<TProperties, TStaticData>>): IModuleItemDataKey {
		return {
			type: 'key',
			contents: [],
		};
	}

	public makeDataFromTemplate<TProperties, TStaticData>(_config: Immutable<IModuleConfigKey<TProperties, TStaticData>>, _template: IModuleItemTemplateKey, _context: IItemCreationContext): IModuleItemDataKey {
		return {
			type: 'key',
			contents: [],
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
	readonly contents: AppearanceItems;
}

export class ItemModuleKey<TProperties = unknown, TStaticData = unknown> implements IItemModule<TProperties, TStaticData, 'key'>, ItemModuleKeyProps<TProperties, TStaticData> {
	public readonly type = 'key';

	public readonly assetManager: AssetManager;
	public readonly config: Immutable<IModuleConfigKey<TProperties, TStaticData>>;
	public readonly contents: AppearanceItems;

	public get interactionType(): ItemInteractionType {
		return ItemInteractionType.MODIFY;
	}

	//TODO: Add Extra InteractionId? (Disallow key change to Offline Players by default + Add Modifier to change that behavior)
	public readonly interactionId: InteractionId = 'interact';

	protected constructor(props: ItemModuleKeyProps<TProperties, TStaticData>, overrideProps?: Partial<ItemModuleKeyProps<TProperties, TStaticData>>) {
		this.assetManager = overrideProps?.assetManager ?? props.assetManager;
		this.config = overrideProps?.config ?? props.config;
		this.contents = overrideProps?.contents ?? props.contents;
	}

	protected withProps(overrideProps: Partial<ItemModuleKeyProps<TProperties, TStaticData>>): ItemModuleKey<TProperties, TStaticData> {
		return new ItemModuleKey(this, overrideProps);
	}

	public static loadFromData<TProperties, TStaticData>(config: Immutable<IModuleConfigKey<TProperties, TStaticData>>, data: IModuleItemDataKey, context: IItemLoadContext): ItemModuleKey<TProperties, TStaticData> {
		return new ItemModuleKey({
			assetManager: context.assetManager,
			config,
			contents: [],
		});
	}

	public exportToTemplate(): IModuleItemTemplateKey {
		return {
			type: 'key',
			contents: this.contents.map((item) => item.exportToTemplate()),
		};
	}

	public exportData(options: IExportOptions): IModuleItemDataKey {
		return {
			type: 'key',
			contents: this.contents.map((item) => item.exportToBundle(options)),
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
		return this.contents;
	}

	public setContents(items: AppearanceItems): ItemModuleKey<TProperties, TStaticData> | null {
		return this.withProps({
			contents: items,
		});
	}
}
