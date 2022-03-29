import { Currency } from '@uniswap/sdk-core'
import Fuse from 'fuse.js'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { ListRenderItemInfo } from 'react-native'
import { BackButton } from 'src/components/buttons/BackButton'
import { FilterGroup } from 'src/components/CurrencySelector/FilterGroup'
import { Option } from 'src/components/CurrencySelector/Option'
import { SearchTextInput } from 'src/components/input/SearchInput'
import { Flex } from 'src/components/layout'
import { ChainId } from 'src/constants/chains'
import { useActiveChainIds } from 'src/features/chains/utils'
import { useAllBalancesByChainId } from 'src/features/dataApi/balances'
import { currencyId } from 'src/utils/currencyId'
import { useFilteredCurrencies } from './hooks'
import { CurrencySearchResultList } from './SearchResults'

interface CurrencySearchProps {
  currencies: Currency[]
  onSelectCurrency: (currency: Currency) => void
  otherCurrency?: Currency | null
  selectedCurrency?: Currency | null
  showNonZeroBalancesOnly?: boolean
}

export function CurrencySelect({
  currencies,
  onSelectCurrency,
  otherCurrency,
  showNonZeroBalancesOnly,
}: CurrencySearchProps) {
  const currentChains = useActiveChainIds()
  const { balances } = useAllBalancesByChainId(currentChains)

  const {
    filteredCurrencies,
    onChainPress,
    onChangeText,
    onClearChainFilter,
    onClearSearchFilter,
    onToggleFavoritesFilter,
    searchFilter,
    selected,
  } = useFilteredCurrencies(currencies, otherCurrency?.chainId ?? null)

  const { t } = useTranslation()

  return (
    <Flex gap="lg" px="md">
      <Flex centered row gap="sm">
        <BackButton />
        <SearchTextInput value={searchFilter} onChangeText={onChangeText} />
      </Flex>

      <FilterGroup
        resetButtonLabel={showNonZeroBalancesOnly ? t('Your tokens') : t('All tokens')}
        selected={selected}
        onPressFavorites={onToggleFavoritesFilter}
        onPressNetwork={onChainPress}
        onReset={onClearChainFilter}
      />

      <CurrencySearchResultList
        currencies={filteredCurrencies}
        renderItem={({ item }: ListRenderItemInfo<Fuse.FuseResult<Currency>>) => {
          const currency = item.item
          const tokenAddress = currencyId(currency)
          const portfolioBalance = balances?.[currency.chainId as ChainId]?.[tokenAddress]
          return (
            <Option
              balance={portfolioBalance}
              currency={currency}
              currencyPrice={
                portfolioBalance
                  ? {
                      price: portfolioBalance.balanceUSD,
                      relativeChange24: portfolioBalance.relativeChange24,
                    }
                  : undefined
              }
              matches={item.matches}
              metadataType="balance"
              onPress={() => onSelectCurrency?.(currency)}
            />
          )
        }}
        searchFilter={searchFilter}
        onClearSearchFilter={() => {
          onClearSearchFilter()
          onClearChainFilter()
        }}
      />
    </Flex>
  )
}
