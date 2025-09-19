// Real-time mint event tracking using Helius WebSocket
const HELIUS_WS_URL = process.env.REACT_APP_HELIUS_WS || 'wss://mainnet.helius-rpc.com/?api-key=16b9324a-5b8c-47b9-9b02-6efa868958e5';
const HELIUS_TRANSACTIONS_API = process.env.REACT_APP_HELIUS_TRANSACTIONS_API || 'https://api.helius.xyz/v0/transactions/?api-key=16b9324a-5b8c-47b9-9b02-6efa868958e5';

const trackMintEvents = (programId, onMintEvent) => {
  console.log('🔗 Connecting to Helius WebSocket for real-time tracking...');
  console.log(`📡 WebSocket URL: ${HELIUS_WS_URL}`);
  console.log(`🎯 Tracking program: ${programId}`);

  const ws = new WebSocket(HELIUS_WS_URL);

  ws.onopen = () => {
    console.log('✅ Connected to Helius WebSocket');

    // Subscribe to program account changes
    const subscriptionMessage = {
      jsonrpc: '2.0',
      id: 1,
      method: 'programSubscribe',
      params: [
        programId,
        {
          commitment: 'confirmed',
          encoding: 'jsonParsed',
          filters: []
        }
      ]
    };

    ws.send(JSON.stringify(subscriptionMessage));
    console.log('📡 Subscribed to program events');
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      if (data.method === 'programNotification') {
        const { account, pubkey } = data.params.result.value;

        // Check if this is a mint event
        if (account && account.data && account.data.parsed) {
          const eventData = {
            programId: pubkey,
            accountData: account.data.parsed,
            slot: data.params.result.context.slot,
            timestamp: new Date().toISOString(),
            txHash: data.params.result.value.signature || 'unknown'
          };

          console.log('🎨 Mint Event Detected:', eventData);

          if (onMintEvent) {
            onMintEvent(eventData);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error processing WebSocket message:', error);
    }
  };

  ws.onerror = (error) => {
    console.error('❌ WebSocket error:', error);
  };

  ws.onclose = () => {
    console.log('🔌 WebSocket connection closed');
    // Implement reconnection logic
    setTimeout(() => {
      console.log('🔄 Attempting to reconnect...');
      trackMintEvents(programId, onMintEvent);
    }, 5000);
  };

  return ws;
};

// Enhanced transaction parsing using Helius API
export const parseTransactionHistory = async (address, limit = 10) => {
  try {
    console.log(`📊 Fetching transaction history for: ${address}`);

    const response = await fetch(`${HELIUS_TRANSACTIONS_API}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: {
          accounts: [address],
          limit: limit,
          sortOrder: 'desc'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Retrieved ${data.result?.length || 0} transactions`);

    return data.result || [];
  } catch (error) {
    console.error('❌ Failed to fetch transaction history:', error);
    return [];
  }
};

// Utility function to format mint events for display
export const formatMintEvent = (eventData) => {
  return {
    id: `${eventData.txHash}-${eventData.slot}`,
    type: 'MINT_EVENT',
    programId: eventData.programId,
    timestamp: eventData.timestamp,
    details: {
      slot: eventData.slot,
      transaction: eventData.txHash,
      data: eventData.accountData
    }
  };
};

export { trackMintEvents };