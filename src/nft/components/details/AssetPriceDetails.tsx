import { useWeb3React } from '@web3-react/core'
import { CancelListingIcon, MinusIcon, PlusIcon } from 'nft/components/icons'
import { useBag } from 'nft/hooks'
import { CollectionInfoForAsset, GenieAsset, TokenType } from 'nft/types'
import { useCallback, useMemo } from 'react'
import { ethNumberStandardFormatter, formatEthPrice, getMarketplaceIcon, timeLeft, useUsdPrice } from 'nft/utils'

import { useNavigate } from 'react-router-dom'
import { Upload } from 'react-feather'
import styled, { useTheme } from 'styled-components/macro'
import { ThemedText } from 'theme'
import { shortenAddress } from 'nft/utils/address'
import useCopyClipboard from 'hooks/useCopyClipboard'

interface AssetPriceDetailsProps {
  asset: GenieAsset
  collection: CollectionInfoForAsset
}

const Container = styled.div`
  width: 100%;
  min-width: 360px;
`

const BestPriceContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background-color: ${({ theme }) => theme.backgroundSurface};
  border: 1px solid ${({ theme }) => theme.backgroundOutline};
  border-radius: 16px;
`

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
`

const PriceRow = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-end;
`

const MarketplaceIcon = styled.img`
  width: 20px;
  height: 20px;
  border-radius: 4px;
  margin-top: auto;
  margin-bottom: auto;
`

const BuyNowButton = styled.div<{ assetInBag: boolean; margin: boolean; useAccentColor: boolean }>`
  width: 100%;

  background-color: ${({ theme, assetInBag, useAccentColor }) =>
    assetInBag ? theme.accentFailure : useAccentColor ? theme.accentAction : theme.backgroundInteractive};
  border-radius: 12px;
  padding: 10px 12px;
  margin-top: ${({ margin }) => (margin ? '12px' : '0px')};
  text-align: center;
  cursor: pointer;

  &:hover {
    background-color: ${({ theme, assetInBag }) => (assetInBag ? theme.accentFailureSoft : theme.accentActionSoft)};
    transition: ${({
      theme: {
        transition: { duration, timing },
      },
    }) => `background-color ${duration.medium} ${timing.ease}`};
  }
`

const Erc1155BuyNowButton = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  background-color: ${({ theme }) => theme.backgroundSurface};
  border: ${({ theme }) => `1px solid ${theme.backgroundOutline}`};
  border-radius: 12px;
  margin-top: 12px;
  text-align: center;
  cursor: pointer;
  justify-content: space-between;
  overflow-x: hidden;
`

const Tertiary = styled(ThemedText.BodySecondary)`
  color: ${({ theme }) => theme.textTertiary};
`

const Erc1155BuyNowText = styled.div`
  display: flex;
  width: 100%;
  padding: 10px 12px;
  justify-content: center;
  cursor: default;
`

const Erc1155ChangeButton = styled(Erc1155BuyNowText)<{ remove: boolean }>`
  background-color: ${({ theme, remove }) => (remove ? theme.accentFailureSoft : theme.accentActionSoft)};
  color: ${({ theme, remove }) => (remove ? theme.accentFailure : theme.accentAction)};
  cursor: pointer;

  :hover {
    background-color: ${({ theme, remove }) => (remove ? theme.accentFailure : theme.accentAction)};
    color: ${({ theme }) => theme.textPrimary};
  }
`

const UploadLink = styled.a`
  color: ${({ theme }) => theme.textSecondary};
  cursor: pointer;

  &:hover {
    opacity: ${({ theme }) => theme.opacity.hover};

    transition: ${({
      theme: {
        transition: { duration, timing },
      },
    }) => `opacity ${duration.medium} ${timing.ease}`};
  }
`

const NotForSaleContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 48px 18px;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
`

const DiscoveryContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`

const OwnerText = styled.a`
  font-size: 14px;
  line-height: 20px;
  color: ${({ theme }) => theme.textSecondary};
  text-decoration: none;

  &:hover {
    opacity: ${({ theme }) => theme.opacity.hover};

    transition: ${({
      theme: {
        transition: { duration, timing },
      },
    }) => `opacity ${duration.medium} ${timing.ease}`};
  }
`

const OwnerInformationContainer = styled.div`
  color: ${({ theme }) => theme.textSecondary};
  display: flex;
  justify-content: space-between;
  padding: 0 8px;
  margin-bottom: 40px;
`

export const OwnerContainer = ({ asset }: { asset: GenieAsset }) => {
  const listing = asset.sellorders && asset.sellorders.length > 0 ? asset.sellorders[0] : undefined
  const expirationDate = listing ? new Date(listing.orderClosingDate) : undefined
  const USDPrice = useUsdPrice(asset)

  const navigate = useNavigate()

  return (
    <Container>
      <BestPriceContainer>
        <HeaderRow>
          <ThemedText.SubHeader fontWeight={500} lineHeight={'24px'}>
            {listing ? 'Your Price' : 'List for Sale'}
          </ThemedText.SubHeader>
          {listing && <MarketplaceIcon alt={listing.marketplace} src={getMarketplaceIcon(listing.marketplace)} />}
        </HeaderRow>
        <PriceRow>
          {listing ? (
            <>
              <ThemedText.MediumHeader fontSize={'28px'} lineHeight={'36px'}>
                {formatEthPrice(asset.priceInfo.ETHPrice)}
              </ThemedText.MediumHeader>
              {USDPrice && (
                <ThemedText.BodySecondary lineHeight={'24px'}>
                  {ethNumberStandardFormatter(USDPrice, true, true)}
                </ThemedText.BodySecondary>
              )}
            </>
          ) : (
            <ThemedText.BodySecondary fontSize="14px" lineHeight={'20px'}>
              Get the best price for your NFT by selling with Uniswap.
            </ThemedText.BodySecondary>
          )}
        </PriceRow>
        {expirationDate && (
          <ThemedText.BodySecondary fontSize={'14px'}>Sale ends: {timeLeft(expirationDate)}</ThemedText.BodySecondary>
        )}
        {!listing ? (
          <BuyNowButton assetInBag={false} margin={true} useAccentColor={true} onClick={() => navigate('/profile')}>
            <ThemedText.SubHeader lineHeight={'20px'}>List</ThemedText.SubHeader>
          </BuyNowButton>
        ) : (
          <>
            <BuyNowButton assetInBag={false} margin={true} useAccentColor={false} onClick={() => navigate('/profile')}>
              <ThemedText.SubHeader lineHeight={'20px'}>Adjust listing</ThemedText.SubHeader>
            </BuyNowButton>
            <BuyNowButton assetInBag={true} margin={false} useAccentColor={false} onClick={() => navigate('/profile')}>
              <ThemedText.SubHeader lineHeight={'20px'}>Cancel listing</ThemedText.SubHeader>
            </BuyNowButton>
          </>
        )}
      </BestPriceContainer>
    </Container>
  )
}

export const NotForSale = ({ collection }: { collection: CollectionInfoForAsset }) => {
  const theme = useTheme()

  return (
    <BestPriceContainer>
      <NotForSaleContainer>
        <CancelListingIcon width="79px" height="79px" color={theme.textTertiary} />
        <ThemedText.SubHeader fontWeight={500} lineHeight="24px">
          Not for sale
        </ThemedText.SubHeader>
        <DiscoveryContainer>
          <ThemedText.BodySecondary fontSize="14px" lineHeight="20px">
            Discover similar NFTs for sale in
          </ThemedText.BodySecondary>
          <ThemedText.Link lineHeight="20px">{collection.collectionName}</ThemedText.Link>
        </DiscoveryContainer>
      </NotForSaleContainer>
    </BestPriceContainer>
  )
}

export const AssetPriceDetails = ({ asset, collection }: AssetPriceDetailsProps) => {
  const { account } = useWeb3React()
  const cheapestOrder = asset.sellorders && asset.sellorders.length > 0 ? asset.sellorders[0] : undefined
  const expirationDate =
    cheapestOrder && cheapestOrder?.orderClosingDate ? new Date(cheapestOrder.orderClosingDate) : undefined
  const itemsInBag = useBag((s) => s.itemsInBag)
  const addAssetsToBag = useBag((s) => s.addAssetsToBag)
  const removeAssetsFromBag = useBag((s) => s.removeAssetsFromBag)

  const USDPrice = useUsdPrice(asset)
  const isErc1555 = asset.tokenType === TokenType.ERC1155
  const [isCopied, setCopied] = useCopyClipboard()

  const { quantity, assetInBag } = useMemo(() => {
    return {
      quantity: itemsInBag.filter(
        (x) => x.asset.tokenType === 'ERC1155' && x.asset.tokenId === asset.tokenId && x.asset.address === asset.address
      ).length,
      assetInBag: itemsInBag.some(
        (item) => asset.tokenId === item.asset.tokenId && asset.address === item.asset.address
      ),
    }
  }, [asset, itemsInBag])

  const isOwner =
    asset.owner && typeof asset.owner === 'string' ? account?.toLowerCase() === asset.owner.toLowerCase() : false

  if (isOwner) {
    return <OwnerContainer asset={asset} />
  }

  const shortAddress = shortenAddress(asset.owner ?? '')
  const uploadLink = asset.tokenType === 'ERC1155' ? asset.creator : asset.owner

  return (
    <Container>
      <OwnerInformationContainer>
        <OwnerText target="_blank" href={`https://etherscan.io/address/${asset.owner}`}>
          {asset.tokenType === 'ERC1155' ? '' : <span>{isOwner ? 'you' : shortAddress}</span>}
        </OwnerText>
        <UploadLink
          onClick={() => {
            setCopied(window.location.href)
          }}
          target="_blank"
        >
          <Upload size={20} strokeWidth={2} />
        </UploadLink>
      </OwnerInformationContainer>

      {cheapestOrder && asset.priceInfo ? (
        <BestPriceContainer>
          <HeaderRow>
            <ThemedText.SubHeader fontWeight={500} lineHeight={'24px'}>
              Best Price
            </ThemedText.SubHeader>
            <MarketplaceIcon alt={cheapestOrder.marketplace} src={getMarketplaceIcon(cheapestOrder.marketplace)} />
          </HeaderRow>
          <PriceRow>
            <ThemedText.MediumHeader fontSize={'28px'} lineHeight={'36px'}>
              {formatEthPrice(asset.priceInfo.ETHPrice)}
            </ThemedText.MediumHeader>
            {USDPrice && (
              <ThemedText.BodySecondary lineHeight={'24px'}>
                {ethNumberStandardFormatter(USDPrice, true, true)}
              </ThemedText.BodySecondary>
            )}
          </PriceRow>
          {expirationDate && <Tertiary fontSize={'14px'}>Sale ends: {timeLeft(expirationDate)}</Tertiary>}
          {!isErc1555 || !assetInBag ? (
            <BuyNowButton
              assetInBag={assetInBag}
              margin={true}
              useAccentColor={true}
              onClick={() => (assetInBag ? removeAssetsFromBag([asset]) : addAssetsToBag([asset]))}
            >
              <ThemedText.SubHeader lineHeight={'20px'}>
                <span style={{ color: 'white' }}>{assetInBag ? 'Remove' : 'Buy Now'}</span>
              </ThemedText.SubHeader>
            </BuyNowButton>
          ) : (
            <Erc1155BuyNowButton>
              <Erc1155ChangeButton remove={true} onClick={() => removeAssetsFromBag([asset])}>
                <MinusIcon width="20px" height="20px" />
              </Erc1155ChangeButton>
              <Erc1155BuyNowText>
                <ThemedText.SubHeader lineHeight={'20px'}>{quantity}</ThemedText.SubHeader>
              </Erc1155BuyNowText>
              <Erc1155ChangeButton remove={false} onClick={() => addAssetsToBag([asset])}>
                <PlusIcon width="20px" height="20px" />
              </Erc1155ChangeButton>
            </Erc1155BuyNowButton>
          )}
        </BestPriceContainer>
      ) : (
        <NotForSale collection={collection} />
      )}
    </Container>
  )
}
