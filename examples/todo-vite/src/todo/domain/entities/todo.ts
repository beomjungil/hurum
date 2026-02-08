import { z } from 'zod'

export const PrioritySchema = z.enum(['p1', 'p2', 'p3', 'p4'])
export type Priority = z.infer<typeof PrioritySchema>

export const TodoSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  completed: z.boolean(),
  priority: PrioritySchema,
  projectId: z.string().nullable(),
  labelIds: z.array(z.string()),
  dueDate: z.string().nullable(),
  parentId: z.string().nullable().default(null),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export type Todo = z.infer<typeof TodoSchema>
