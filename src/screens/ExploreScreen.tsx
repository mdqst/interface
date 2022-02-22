import { Currency } from '@uniswap/sdk-core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { ListRenderItemInfo } from 'react-native'
import { TabScreenProp } from 'src/app/navigation/types'
import { NetworkGroupPrefixButton } from 'src/components/CurrencySelector/CurrencySelect'
import { useFilteredCurrencies } from 'src/components/CurrencySelector/hooks'
import { Option } from 'src/components/CurrencySelector/Option'
import { CurrencySearchTextInput } from 'src/components/CurrencySelector/SearchInput'
import { CurrencySearchResultList } from 'src/components/CurrencySelector/SearchResults'
import { Flex } from 'src/components/layout'
import { Screen } from 'src/components/layout/Screen'
import { NetworkButtonGroup } from 'src/components/Network/NetworkButtonGroup'
import { ChainId } from 'src/constants/chains'
import { useTokenPrices } from 'src/features/historicalChainData/useTokenPrices'
import { useAllCurrencies } from 'src/features/tokens/useTokens'
import { Screens, Tabs } from 'src/screens/Screens'
import { currencyId } from 'src/utils/currencyId'
import { flattenObjectOfObjects } from 'src/utils/objects'

export function ExploreScreen({ navigation }: TabScreenProp<Tabs.Explore>) {
  const currencies = useAllCurrencies()

  const onPressCurrency = (currency: Currency) => {
    navigation.navigate(Screens.TokenDetails, { currency })
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      <Explorer
        currencies={flattenObjectOfObjects(currencies)}
        onSelectCurrency={onPressCurrency}
      />
    </Screen>
  )
}

interface ExplorerProps {
  currencies: Currency[]
  onSelectCurrency: (currency: Currency) => void
}

function Explorer({ currencies, onSelectCurrency }: ExplorerProps) {
  const {
    filteredCurrencies,
    chainFilter,
    onChainPress,
    onChangeText,
    onClearSearchFilter,
    onClearChainFilter,
    searchFilter,
  } = useFilteredCurrencies(currencies)

  const { chainIdToPrices } = useTokenPrices(currencies)

  const { t } = useTranslation()

  return (
    <Flex centered gap="lg" p="md">
      <CurrencySearchTextInput value={searchFilter} onChangeText={onChangeText} />

      <NetworkButtonGroup
        customButton={
          <NetworkGroupPrefixButton
            elementNameSuffix={'all-tokens'}
            label={t('All tokens')}
            selected={chainFilter === null}
            onPress={onClearChainFilter}
          />
        }
        selected={chainFilter}
        onPress={onChainPress}
      />

      <CurrencySearchResultList
        currencies={filteredCurrencies}
        renderItem={({ item }: ListRenderItemInfo<Currency>) => {
          return (
            <Option
              currency={item as Currency}
              currencyPrice={
                chainIdToPrices?.[item.chainId as ChainId]?.addressToPrice?.[currencyId(item)]
                  ?.priceUSD
              }
              metadataType="price"
              onPress={() => onSelectCurrency?.(item)}
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
