import { z } from 'zod'

export const LabelSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  createdAt: z.number(),
})

export type Label = z.infer<typeof LabelSchema>
