import * as z from 'zod';
import { CharacterIdSchema } from '../../character/characterTypes.ts';

export const KeyDataBundleSchema = z.object({
	data: z.object({
		/** id of the character created the item */
		id: CharacterIdSchema,
		/** Name of the character that created the item */
		name: z.string(),
		/** Time the item was created */
		time: z.number(),
	}).optional(),
	/** Bitting data */
	bitting: z.discriminatedUnion('side', [
		z.object({
			side: z.literal('server'),
			/** Shape that the key has*/
			keyShape: z.string().optional(),
			/** Bitting that the key has*/
			keyBitting: z.string().optional(),
		}),
		z.object({
			side: z.literal('client'),
			/** Whether the item has a password */
			hasBitting: z.boolean().optional(),
		}),
	]).optional(),
});

export type KeyDataBundle = z.infer<typeof KeyDataBundleSchema>;
