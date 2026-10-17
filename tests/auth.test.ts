import { ethers } from 'ethers';
import { nonceStore } from '../server/auth/nonceStore';
import { sessionStore } from '../server/auth/sessionStore';

async function runTests() {
  console.log('--- Iniciando Testes de Autenticação Web3 RV.Web3 ---\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // Generate a mock testing wallet
  const testWallet = ethers.Wallet.createRandom();
  const attackerWallet = ethers.Wallet.createRandom();

  // Test 1: Nonce Generation & Formatting
  console.log('1. Testando geração de Nonce e formatação da mensagem SIWE...');
  const record = nonceStore.createNonce(testWallet.address, 1, 'rv-web3.app');
  assert(record.nonce.length === 64, 'Nonce possui 64 caracteres hexadecimais (32 bytes de entropia)');
  assert(record.message.includes(testWallet.address.toLowerCase()), 'Mensagem inclui o endereço da carteira em minúsculas');
  assert(record.message.includes('Nonce: ' + record.nonce), 'Mensagem inclui o nonce gerado');
  assert(record.expiresAt > Date.now(), 'Tempo de expiração no futuro (+5 min)');

  // Test 2: Valid Signature Verification
  console.log('\n2. Testando assinatura criptográfica e recuperação de endereço...');
  const signature = await testWallet.signMessage(record.message);
  const recovered = ethers.verifyMessage(record.message, signature);
  assert(recovered.toLowerCase() === testWallet.address.toLowerCase(), 'Endereço recuperado corresponde ao signatário');

  const consumeResult = nonceStore.consumeNonce(record.nonce, testWallet.address);
  assert(consumeResult.valid === true, 'Consumo de nonce válido bem-sucedido');

  // Test 3: Anti-Replay Protection
  console.log('\n3. Testando proteção contra Replay Attack (Reutilização de Nonce)...');
  const replayAttempt = nonceStore.consumeNonce(record.nonce, testWallet.address);
  assert(replayAttempt.valid === false, 'Tentativa de replay com o mesmo nonce foi bloqueada');
  assert(Boolean(replayAttempt.reason?.includes('Nonce não encontrado') || replayAttempt.reason?.includes('Replay')), 'Motivo de falha anti-replay reportado corretamente');

  // Test 4: Attacker Signature Mismatch
  console.log('\n4. Testando detecção de tentativa de personificação com carteira incorreta...');
  const record2 = nonceStore.createNonce(testWallet.address, 1, 'rv-web3.app');
  const forgedSignature = await attackerWallet.signMessage(record2.message);
  const recoveredAttacker = ethers.verifyMessage(record2.message, forgedSignature);
  assert(recoveredAttacker.toLowerCase() !== testWallet.address.toLowerCase(), 'Assinatura forjada falha na validação de endereço');

  // Test 5: Session Token Creation & HMAC-SHA256 Verification
  console.log('\n5. Testando criação e validação de tokens de sessão...');
  const { token, session } = sessionStore.createSession(testWallet.address, 1);
  assert(token.includes('.'), 'Token possui formato compactado base64url.signature');
  assert(session.address === testWallet.address.toLowerCase(), 'Sessão possui endereço correto');

  const verifiedSession = sessionStore.verifyToken(token);
  assert(verifiedSession !== null, 'Token de sessão válido verificado com sucesso');
  assert(verifiedSession?.address === testWallet.address.toLowerCase(), 'Endereço da sessão verificado confere');

  // Test 6: Tampered Token Detection
  console.log('\n6. Testando rejeição de token de sessão adulterado...');
  const tamperedToken = token.slice(0, -4) + 'abcd';
  const tamperedResult = sessionStore.verifyToken(tamperedToken);
  assert(tamperedResult === null, 'Token adulterado rejeitado pela verificação HMAC');

  console.log(`\n--- Resultado dos Testes: ${passed} passaram, ${failed} falharam ---`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Erro na execução dos testes:', e);
  process.exit(1);
});
