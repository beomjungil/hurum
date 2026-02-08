import { z } from 'zod'

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  createdAt: z.number(),
})

export type Project = z.infer<typeof ProjectSchema>
