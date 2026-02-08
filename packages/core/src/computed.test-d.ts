import { describe, it, expectTypeOf } from 'vitest'
import { Store } from './store'
import { Nested } from './nested'

describe('computed type inference', () => {
  it('.computed() state includes resolved nested types', () => {
    const NestChildStore = Store({ state: { val: 0 } })
      .computed({ doubled: (s) => s.val * 2 })

    Store({ state: { child: Nested(NestChildStore), base: 10 } })
      .computed({
        total: (state) => {
          expectTypeOf(state.child.val).toEqualTypeOf<number>()
          expectTypeOf(state.child.doubled).toEqualTypeOf<number>()
          expectTypeOf(state.base).toEqualTypeOf<number>()
          return state.base + state.child.val
        },
      })
  })
})
