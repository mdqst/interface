import { Store } from '@reduxjs/toolkit'
import { persistStore } from 'redux-persist'
import { createDefaultStore } from 'state'

import { initialState as initialListsState } from './lists/reducer'
import { initialState as initialTransactionsState } from './transactions/reducer'
import { initialState as initialUserState } from './user/reducer'

// // Mock redux-persist storage
// jest.mock('redux-persist/lib/storage', () => {
//   const storage: Record<string, string> = {}
//   return {
//     setItem: (key: string, value: string) =>
//       Promise.resolve().then(() => {
//         storage[key] = value
//       }),
//     getItem: (key: string) => Promise.resolve().then(() => storage[key]),
//     removeItem: (key: string) =>
//       Promise.resolve().then(() => {
//         delete storage[key]
//       }),
//   }
// })

const defaultState = {
  lists: {},
  transactions: {},
  user: {},
  _persist: {
    rehydrated: true,
    version: 0,
  },
  application: {
    chainId: null,
    fiatOnramp: {
      availabilityChecked: false,
      available: false,
    },
    openModal: null,
    popupList: [],
  },
  burn: {
    independentField: 'LIQUIDITY_PERCENT',
    typedValue: '0',
  },
  burnV3: {
    percent: 0,
  },
  logs: {},
  mint: {
    independentField: 'CURRENCY_A',
    leftRangeTypedValue: '',
    otherTypedValue: '',
    rightRangeTypedValue: '',
    startPriceTypedValue: '',
    typedValue: '',
  },
  mintV3: {
    independentField: 'CURRENCY_A',
    leftRangeTypedValue: '',
    rightRangeTypedValue: '',
    startPriceTypedValue: '',
    typedValue: '',
  },
  multicall: {
    callResults: {},
  },
  routingApi: {
    config: {
      focused: true,
      keepUnusedDataFor: 60,
      middlewareRegistered: true,
      online: true,
      reducerPath: 'routingApi',
      refetchOnFocus: false,
      refetchOnMountOrArgChange: false,
      refetchOnReconnect: false,
    },
    mutations: {},
    provided: {},
    queries: {},
    subscriptions: {},
  },
  routingApiV2: {
    config: {
      focused: true,
      keepUnusedDataFor: 60,
      middlewareRegistered: true,
      online: true,
      reducerPath: 'routingApiV2',
      refetchOnFocus: false,
      refetchOnMountOrArgChange: false,
      refetchOnReconnect: false,
    },
    mutations: {},
    provided: {},
    queries: {},
    subscriptions: {},
  },
  wallets: {
    connectedWallets: [],
    switchingChain: false,
  },
}

describe('redux migrations', () => {
  let store: Store

  beforeEach(() => {
    localStorage.clear()
    // We need to re-create the store before each test so it starts with undefined state.
    store = createDefaultStore()
  })

  it('clears legacy redux_localstorage_simple values during the initial migration', async () => {
    localStorage.setItem('redux_localstorage_simple_transactions', JSON.stringify({ test: 'transactions' }))
    localStorage.setItem('redux_localstorage_simple_user', JSON.stringify({ test: 'user' }))
    localStorage.setItem('redux_localstorage_simple_lists', JSON.stringify({ test: 'lists' }))

    persistStore(store)
    // wait for the migration to complete
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(localStorage.getItem('redux_localstorage_simple_transactions')).toBeNull()
    expect(localStorage.getItem('redux_localstorage_simple_user')).toBeNull()
    expect(localStorage.getItem('redux_localstorage_simple_lists')).toBeNull()

    // todo: test the new persisted values after mocking localStorage
    // expect(JSON.parse(localStorage.getItem('persist:root') ?? '{}')).toMatchObject({
    //   user: state.user,
    //   transactions: state.transactions,
    //   lists: state.lists,
    // })

    const state = store.getState()
    expect(state).toMatchObject({
      ...defaultState,
      // These are migrated values.
      lists: {
        test: 'lists',
      },
      transactions: {
        test: 'transactions',
      },
      user: {
        test: 'user',
      },
    })
  })

  it('initial state with no previous persisted state', async () => {
    persistStore(store)
    // wait for the migration to complete
    await new Promise((resolve) => setTimeout(resolve, 0))
    const state = store.getState()
    expect(state).toMatchObject(defaultState)

    // todo: test the new persisted values after mocking localStorage
    // expect(JSON.parse(localStorage.getItem('persist:root') ?? '{}')).toMatchObject({
    //   user: state.user,
    //   transactions: state.transactions,
    //   lists: state.lists,
    // })
  })

  it('migrates from a previous version of the state type', async () => {
    localStorage.setItem(
      'persist:root',
      JSON.stringify({
        user: { ...initialUserState, test: 'user' },
        transactions: initialTransactionsState,
        lists: initialListsState,
        _persist: { version: -1 },
      })
    )

    persistStore(store)
    // wait for the migration to complete
    await new Promise((resolve) => setTimeout(resolve, 0))

    const state = store.getState()
    expect(state).toMatchObject(defaultState)

    // todo: test the new persisted values after mocking localStorage
    // expect(JSON.parse(localStorage.getItem('persist:root') ?? '{}')).toMatchObject({
    //   user: state.user,
    //   transactions: state.transactions,
    //   lists: state.lists,
    // })
  })
})
