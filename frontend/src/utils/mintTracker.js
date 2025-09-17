const trackMintEvents = () => {
  const socket = new WebSocket('wss://mintgene-analytics.com/events');
  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log(`🧬 Gene Minted: ${data.logicId} | TX: ${data.txHash}`);
  };
};