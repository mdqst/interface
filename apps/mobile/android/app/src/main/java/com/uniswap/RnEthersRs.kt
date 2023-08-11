package com.uniswap
import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys

class RnEthersRs(applicationContext: Context) {

  // Long represents the opaque pointer to the Rust LocalWallet struct.
  private val walletCache: MutableMap<String, Long> = mutableMapOf()
  private val keychain: SharedPreferences

  init {
    val masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)
    keychain = EncryptedSharedPreferences.create(
      "preferences",
      masterKeyAlias,
      applicationContext,
      EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
      EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )
  }

  val mnemonicIds: Array<String>
    get() = keychain.all.keys.map {
        key -> key.replace(ENTIRE_MNEMONIC_PREFIX, "")
    }.toTypedArray()

  /**
   * Imports a mnemonic and returns the associated address.
   * @param mnemonic The mnemonic to import.
   * @return The address associated with the mnemonic.
   */
  fun importMnemonic(mnemonic: String): String {
    val privateKey = privateKeyFromMnemonic(mnemonic, 0)
    val address = privateKey.address
    return storeNewMnemonic(mnemonic, address)
  }

  /**
   * Generates a new mnemonic, stores it, and returns the associated address.
   * @return The address associated with the new mnemonic.
   */
  fun generateAndStoreMnemonic(): String {
    val mnemonic = generateMnemonic()
    val mnemonicStr = mnemonic.mnemonic
    val addressStr = mnemonic.address
    val res = storeNewMnemonic(mnemonicStr, addressStr)
    mnemonicFree(mnemonic)
    return res
  }

  /**
   * Stores a new mnemonic and its associated address.
   * @param mnemonic The mnemonic to store.
   * @param address The address associated with the mnemonic.
   * @return The address.
   */
  private fun storeNewMnemonic(mnemonic: String?, address: String): String {
    val checkStored = retrieveMnemonic(address)
    if (checkStored == null) {
      val newMnemonicKey = keychainKeyForMnemonicId(address)
      keychain.edit().putString(newMnemonicKey, mnemonic).apply()
    }
    return address
  }


  private fun keychainKeyForMnemonicId(mnemonicId: String): String {
    return MNEMONIC_PREFIX + mnemonicId
  }

  fun retrieveMnemonic(mnemonicId: String): String? {
    return keychain.getString(keychainKeyForMnemonicId(mnemonicId), null)
  }

  val addressesForStoredPrivateKeys: Array<String>
    get() = keychain.all.keys
      .filter { key -> key.contains(PRIVATE_KEY_PREFIX) }
      .map { key -> key.replace(ENTIRE_PRIVATE_KEY_PREFIX, "") }
      .toTypedArray()

  private fun storeNewPrivateKey(address: String, privateKey: String?) {
    val newKey = keychainKeyForPrivateKey(address)
    keychain.edit().putString(newKey, privateKey).apply()
  }

  /**
   * Generates public address for a given mnemonic and returns the associated address.
   * @param mnemonic Mmnemonic to generate the public address from.
   * @param derivationIndex The index of the private key to generate.
   * @return The address associated with the new private key.
   */
  fun generateAddressForMnemonic(mnemonic: String, derivationIndex: Int): String {
    val privateKey = privateKeyFromMnemonic(mnemonic, derivationIndex)
    val address = privateKey.address
    privateKeyFree(privateKey)
    return address
  }

  /**
   * Generates and stores a new private key for a given mnemonic and returns the associated address.
   * @param mnemonicId The id of the mnemonic to generate the private key from.
   * @param derivationIndex The index of the private key to generate.
   * @return The address associated with the new private key.
   */
  fun generateAndStorePrivateKey(mnemonicId: String, derivationIndex: Int): String {
    val mnemonic = retrieveMnemonic(mnemonicId)
    val privateKey = privateKeyFromMnemonic(mnemonic, derivationIndex)
    val xprv = privateKey.privateKey
    val address = privateKey.address
    storeNewPrivateKey(address, xprv)
    privateKeyFree(privateKey)
    return address
  }

  /**
   * Signs a transaction for a given address.
   * @param address The address to sign the transaction for.
   * @param hash The transaction hash to sign.
   * @param chainId The id of the blockchain network.
   * @return The signed transaction hash.
   */
  fun signTransactionForAddress(address: String, hash: String, chainId: Long): String {
    val wallet = retrieveOrCreateWalletForAddress(address)
    val signedHash = signTxWithWallet(wallet, hash, chainId)
    return signedHash.signature
  }

  /**
   * Signs a message for a given address.
   * @param address The address to sign the message for.
   * @param message The message to sign.
   * @return The signed message.
   */
  fun signMessageForAddress(address: String, message: String): String {
    val wallet = retrieveOrCreateWalletForAddress(address)
    return signMessageWithWallet(wallet, message)
  }

  /**
   * Signs a hash for a given address.
   * @param address The address to sign the hash for.
   * @param hash The hash to sign.
   * @param chainId The id of the blockchain network.
   * @return The signed hash.
   */
  fun signHashForAddress(address: String, hash: String, chainId: Long): String {
    val wallet = retrieveOrCreateWalletForAddress(address)
    return signHashWithWallet(wallet, hash, chainId)
  }

  /**
   * Retrieves an existing wallet for a given address or creates a new one if it doesn't exist.
   * @param address The address of the wallet.
   * @return A long representing the pointer to the wallet.
   */
  private fun retrieveOrCreateWalletForAddress(address: String): Long {
    val wallet = walletCache[address]
    if (wallet != null) {
      return wallet
    }
    val privateKey = retrievePrivateKey(address)
    val newWallet = walletFromPrivateKey(privateKey)
    walletCache[address] = newWallet
    return newWallet
  }

  /**
   * Retrieves the private key for a given address.
   * @param address The address to retrieve the private key for.
   * @return The private key, or null if it doesn't exist.
   */
  private fun retrievePrivateKey(address: String): String? {
    return keychain.getString(keychainKeyForPrivateKey(address), null)
  }
  /**
   * Generates the keychain key for a given address.
   * @param address The address to generate the key for.
   * @return The keychain key.
   */
  private fun keychainKeyForPrivateKey(address: String): String {
    return PRIVATE_KEY_PREFIX + address
  }

  companion object {
    private const val PREFIX = "com.uniswap"
    private const val MNEMONIC_PREFIX = ".mnemonic."
    private const val PRIVATE_KEY_PREFIX = ".privateKey."
    private const val ENTIRE_MNEMONIC_PREFIX = PREFIX + MNEMONIC_PREFIX
    private const val ENTIRE_PRIVATE_KEY_PREFIX = PREFIX + PRIVATE_KEY_PREFIX


    /**
     * Generates a mnemonic and its associated address.
     * @return A CMnemonicAndAddress object containing the generated mnemonic and its associated address.
     */
    private external fun generateMnemonic(): CMnemonicAndAddress


    /**
     * Frees the memory allocated for the mnemonic.
     * @param mnemonic The mnemonic to be freed.
     */
    private external fun mnemonicFree(mnemonic: CMnemonicAndAddress)

    /**
     * Generates a private key from a given mnemonic.
     * @param mnemonic The mnemonic to generate the private key from.
     * @param index The index of the private key to generate.
     * @return A CPrivateKey object containing the generated private key.
     */
    private external fun privateKeyFromMnemonic(mnemonic: String?, index: Int): CPrivateKey

    /**
     * Frees the memory allocated for the private key.
     * @param privateKey The private key to be freed.
     */
    private external fun privateKeyFree(privateKey: CPrivateKey)

    /**
     * Creates a wallet from a given private key.
     * @param privateKey The private key to create the wallet from.
     * @return A long representing the pointer to the created wallet.
     */
    private external fun walletFromPrivateKey(privateKey: String?): Long

    /**
     * Frees the memory allocated for the wallet.
     * @param walletPtr The pointer to the wallet to be freed.
     */
    private external fun walletFree(walletPtr: Long)

    /**
     * Signs a transaction with a wallet.
     * @param localWallet The wallet to sign the transaction with.
     * @param txHash The transaction hash to sign.
     * @param chainId The id of the blockchain network.
     * @return A CSignedTransaction object containing the signed transaction.
     */
    private external fun signTxWithWallet(
      localWallet: Long,
      txHash: String,
      chainId: Long
    ): CSignedTransaction // walletPtr is a pointer to a LocalWallet, represented as a long in Java.

    /**
     * Signs a message with a wallet.
     * @param localWallet The wallet to sign the message with.
     * @param message The message to sign.
     * @return The signed message.
     */
    private external fun signMessageWithWallet(
      localWallet: Long,
      message: String
    ): String

    /**
     * Signs a hash with a wallet.
     * @param localWallet The wallet to sign the hash with.
     * @param hash The hash to sign.
     * @param chainId The id of the blockchain network.
     * @return The signed hash.
     */
    private external fun signHashWithWallet(
      localWallet: Long,
      hash: String,
      chainId: Long
    ): String

  /**
   * Frees the memory allocated for the string.
   * @param string The string to be freed.
   */
    private external fun stringFree(string: String)
  }
}

/**
 * Represents a private key and its associated address.
 * @property privateKey The private key.
 * @property address The address associated with the private key.
 * @property handle This is a pointer to a Rust CPrivateKey struct.
 */
class CPrivateKey(
  var privateKey: String,
  var address: String,
  var handle: Long
)

/**
 * Represents a mnemonic and its associated address.
 * @property mnemonic The mnemonic phrase.
 * @property address The address associated with the mnemonic.
 * @property handle This is a pointer to a Rust CMnemonicAndAddress struct.
 */
class CMnemonicAndAddress(
  var mnemonic: String,
  var address: String,
  var handle: Long
)


/**
 * Represents a signed transaction.
 * @property signature The signature of the transaction.
 */
internal class CSignedTransaction(
  var signature: String
)
