import { Currency } from '@uniswap/sdk-core'
import React, { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppDispatch } from 'src/app/hooks'
import { AppStackScreenProp } from 'src/app/navigation/types'
import { CurrencyLogo } from 'src/components/CurrencyLogo'
import { AnimatedBox, Box, Flex } from 'src/components/layout'
import { BackHeader } from 'src/components/layout/BackHeader'
import { HeaderScrollScreen } from 'src/components/layout/screens/HeaderScrollScreen'
import { CurrencyPriceChart } from 'src/components/PriceChart'
import { Text } from 'src/components/Text'
import { useCrossChainBalances } from 'src/components/TokenDetails/hooks'
import { TokenBalances } from 'src/components/TokenDetails/TokenBalances'
import { TokenDetailsActionButtons } from 'src/components/TokenDetails/TokenDetailsActionButton'
import { TokenDetailsBackButtonRow } from 'src/components/TokenDetails/TokenDetailsBackButtonRow'
import { TokenDetailsHeader } from 'src/components/TokenDetails/TokenDetailsHeader'
import { TokenDetailsLoader } from 'src/components/TokenDetails/TokenDetailsLoader'
import { TokenDetailsStats } from 'src/components/TokenDetails/TokenDetailsStats'
import TokenWarningModal from 'src/components/tokens/TokenWarningModal'
import { PollingInterval } from 'src/constants/misc'
import {
  SafetyLevel,
  TokenDetailsScreenQuery,
  useTokenDetailsScreenQuery,
} from 'src/data/__generated__/types-and-hooks'
import { AssetType } from 'src/entities/assets'
import { currencyIdToContractInput } from 'src/features/dataApi/utils'
import { openModal } from 'src/features/modals/modalSlice'
import { ModalName } from 'src/features/telemetry/constants'
import { useTokenWarningDismissed } from 'src/features/tokens/safetyHooks'
import { useCurrency } from 'src/features/tokens/useCurrency'
import {
  CurrencyField,
  TransactionState,
} from 'src/features/transactions/transactionState/transactionState'
import { Screens } from 'src/screens/Screens'
import { currencyAddress, currencyId } from 'src/utils/currencyId'
import { formatUSDPrice } from 'src/utils/format'

type Price = NonNullable<
  NonNullable<NonNullable<NonNullable<TokenDetailsScreenQuery['tokenProjects']>[0]>['markets']>[0]
>['price']

function HeaderPriceLabel({ price }: { price: Price }) {
  const { t } = useTranslation()

  return (
    <Text color="textSecondary" variant="buttonLabelMicro">
      {formatUSDPrice(price?.value) ?? t('Unknown token')}
    </Text>
  )
}

function HeaderTitleElement({
  currency,
  data,
}: {
  currency: Currency
  data: TokenDetailsScreenQuery | undefined
}) {
  const { t } = useTranslation()
  return (
    <Flex centered gap="none">
      <Flex centered row gap="xs">
        <CurrencyLogo currency={currency} size={16} />
        <Text variant="subheadLarge">{currency.name ?? t('Unknown token')}</Text>
      </Flex>
      <HeaderPriceLabel price={data?.tokenProjects?.[0]?.markets?.[0]?.price} />
    </Flex>
  )
}

enum TransactionType {
  BUY,
  SELL,
  SEND,
}

export function TokenDetailsScreen({ route }: AppStackScreenProp<Screens.TokenDetails>) {
  const { currencyId: _currencyId } = route.params
  const currency = useCurrency(_currencyId)

  const { data, loading } = useTokenDetailsScreenQuery({
    variables: {
      contract: currencyIdToContractInput(_currencyId),
    },
    pollInterval: PollingInterval.Fast,
    errorPolicy: 'all',
  })

  if (!currency) {
    // truly cannot render the component or a loading state without a currency
    // we could consider showing an activity spinner here
    return null
  }

  if (!data) {
    if (loading) {
      return <TokenDetailsLoader currency={currency} />
    }
  }

  return <TokenDetails currency={currency} data={data} />
}

function TokenDetails({
  currency,
  data,
}: {
  currency: Currency
  data: TokenDetailsScreenQuery | undefined
}) {
  const dispatch = useAppDispatch()
  const { currentChainBalance, otherChainBalances } = useCrossChainBalances(currency)

  // set if attempting buy or sell, use for warning modal
  const [activeTransactionType, setActiveTransactionType] = useState<TransactionType | undefined>(
    undefined
  )

  const _currencyId = currencyId(currency)
  const [showWarningModal, setShowWarningModal] = useState(false)
  const { tokenWarningDismissed, dismissWarningCallback } = useTokenWarningDismissed(_currencyId)

  const safetyLevel = data?.tokenProjects?.[0]?.safetyLevel

  const initialSendState = useMemo((): TransactionState => {
    return {
      exactCurrencyField: CurrencyField.INPUT,
      exactAmountToken: '',
      [CurrencyField.INPUT]: {
        address: currencyAddress(currency),
        chainId: currency.wrapped.chainId,
        type: AssetType.Currency,
      },
      [CurrencyField.OUTPUT]: null,
      showRecipientSelector: true,
    }
  }, [currency])

  const navigateToSwapBuy = useCallback(() => {
    setActiveTransactionType(undefined)
    const swapFormState: TransactionState = {
      exactCurrencyField: CurrencyField.OUTPUT,
      exactAmountToken: '0',
      [CurrencyField.INPUT]: null,
      [CurrencyField.OUTPUT]: {
        address: currencyAddress(currency),
        chainId: currency.wrapped.chainId,
        type: AssetType.Currency,
      },
    }
    dispatch(openModal({ name: ModalName.Swap, initialState: swapFormState }))
  }, [currency, dispatch])

  const navigateToSwapSell = useCallback(() => {
    setActiveTransactionType(undefined)
    const swapFormState: TransactionState = {
      exactCurrencyField: CurrencyField.INPUT,
      exactAmountToken: '0',
      [CurrencyField.INPUT]: {
        address: currencyAddress(currency),
        chainId: currency.wrapped.chainId,
        type: AssetType.Currency,
      },
      [CurrencyField.OUTPUT]: null,
    }
    dispatch(openModal({ name: ModalName.Swap, initialState: swapFormState }))
  }, [currency, dispatch])

  const onPressSwap = useCallback(
    (swapType: TransactionType.BUY | TransactionType.SELL) => {
      // show warning modal speedbump if token has a warning level and user has not dismissed
      if (safetyLevel !== SafetyLevel.Verified && !tokenWarningDismissed) {
        setActiveTransactionType(swapType)
        setShowWarningModal(true)
      } else {
        if (swapType === TransactionType.BUY) {
          navigateToSwapBuy()
        }
        if (swapType === TransactionType.SELL) {
          navigateToSwapSell()
        }
        return
      }
    },
    [navigateToSwapBuy, navigateToSwapSell, safetyLevel, tokenWarningDismissed]
  )

  const onPressSend = useCallback(() => {
    // show warning modal speedbump if token has a warning level and user has not dismissed
    if (safetyLevel !== SafetyLevel.Verified && !tokenWarningDismissed) {
      setActiveTransactionType(TransactionType.SEND)
      setShowWarningModal(true)
    } else {
      dispatch(openModal({ name: ModalName.Send, ...{ initialState: initialSendState } }))
    }
  }, [safetyLevel, tokenWarningDismissed, dispatch, initialSendState])

  const onAcceptWarning = useCallback(() => {
    dismissWarningCallback()
    setShowWarningModal(false)
    if (activeTransactionType === TransactionType.BUY) {
      navigateToSwapBuy()
    } else if (activeTransactionType === TransactionType.SELL) {
      navigateToSwapSell()
    } else if (activeTransactionType === TransactionType.SEND) {
      navigateToSwapSell()
      dispatch(openModal({ name: ModalName.Send, ...{ initialState: initialSendState } }))
    }
  }, [
    activeTransactionType,
    dismissWarningCallback,
    dispatch,
    initialSendState,
    navigateToSwapBuy,
    navigateToSwapSell,
  ])

  return (
    <AnimatedBox flex={1} mb="md">
      <HeaderScrollScreen
        contentHeader={<TokenDetailsBackButtonRow currency={currency} />}
        fixedHeader={
          <BackHeader>
            <HeaderTitleElement currency={currency} data={data} />
          </BackHeader>
        }>
        <Flex gap="xl" my="md">
          <Flex gap="xxs">
            <TokenDetailsHeader
              currency={currency}
              safetyLevel={safetyLevel}
              onPressWarningIcon={() => setShowWarningModal(true)}
            />
            <CurrencyPriceChart currency={currency} />
          </Flex>
          <Flex gap="lg">
            <TokenBalances
              currentChainBalance={currentChainBalance}
              otherChainBalances={otherChainBalances}
            />
            <Box mx="md">
              <TokenDetailsStats currency={currency} data={data} />
            </Box>
          </Flex>
        </Flex>
      </HeaderScrollScreen>

      <TokenDetailsActionButtons
        showSend={!!currentChainBalance}
        onPressSend={onPressSend}
        onPressSwap={() =>
          onPressSwap(currentChainBalance ? TransactionType.SELL : TransactionType.BUY)
        }
      />

      <TokenWarningModal
        currency={currency}
        disableAccept={!activeTransactionType}
        isVisible={showWarningModal}
        safetyLevel={safetyLevel}
        onAccept={onAcceptWarning}
        onClose={() => {
          setActiveTransactionType(undefined)
          setShowWarningModal(false)
        }}
      />
    </AnimatedBox>
  )
}
