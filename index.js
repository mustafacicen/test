const axios = require('axios');
const fs = require('fs');
const express = require('express');
const ethers = require('ethers');
const cors = require('cors');
const path = require('path'); // Add this line
require('dotenv').config(); // Load environment variables from .env file


const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static('C:\\Users\\musta\\Masaüstü\\FriendtechAIO-main'));


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});



const apiKey = process.env.API_KEY; // Access the API key using process.env
const addressToTrack = '0xcf205808ed36593aa40a44f10c7f7c2f67d4a4d4';
const provider = new ethers.JsonRpcProvider(`https://base-mainnet.g.alchemy.com/v2/Nh7nPKnpk6GGs3YAlxrX1cV-qZQIcW_X`);

const contractABI = [
  'function buyShares(address arg0, uint256 arg1)',
  'function sellShares(address arg0, uint256 arg1)',
  'function getBuyPriceAfterFee(address sharesSubject, uint256 amount) public view returns (uint256)',
  'function getSellPriceAfterFee(address sharesSubject, uint256 amount) public view returns (uint256)'
];
const contractAddress = '0xCF205808Ed36593aa40a44F10c7f7C2F67d4A4d4';

app.post('/buyShares', async (req, res) => {
  const { address, shares, privateKey } = req.body;
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(contractAddress, contractABI, wallet);
  
  try {
    const buyPrice = await contract.getBuyPriceAfterFee(address, shares);
    const tx = await contract.buyShares(address, shares, {
      value: buyPrice,
    });
    const receipt = await tx.wait();
    res.json({ success: true, receipt });
    console.log(receipt);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/sellShares', async (req, res) => {
  const { address, shares, privateKey } = req.body;
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(contractAddress, contractABI, wallet);
  
  try {
    const sellPrice = await contract.getSellPriceAfterFee(address, shares);
    const tx = await contract.sellShares(address, shares, {
      value: sellPrice,
    });
    const receipt = await tx.wait();
    res.json({ success: true, receipt });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

const uniqueAddresses = new Set(); // To keep track of unique addresses

async function getLatestBlockNumber() {
  try {
    const response = await axios.get('https://api.basescan.org/api', {
      params: {
        module: 'block',
        action: 'getblocknobytime',
        timestamp: Math.floor(Date.now() / 1000),
        closest: 'before',
        apikey: apiKey,
      },
    });

    if (response.data.status === '1') {
      return response.data.result;
    } else {
      console.log(`Error fetching latest block: ${JSON.stringify(response.data)}`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching latest block: ${error}`);
    return null;
  }
}



async function trackAddressTransactions() {
  const latestBlock = await getLatestBlockNumber();
  if (latestBlock === null) return;

  try {
    const response = await axios.get('https://api.basescan.org/api', {
      params: {
        module: 'account',
        action: 'txlist',
        address: addressToTrack,
        startblock: latestBlock,
        endblock: 99999999,
        page: 1,
        offset: 100,
        sort: 'asc',
        apikey: apiKey,
      },
    });

    if (response.data.status === '1') {
      const transactions = response.data.result;
      const filtered = transactions.filter(tx => tx.value === '0');
      const filteredByFunction = filtered.filter(tx => tx.functionName === 'buyShares(address sharesSubject,uint256 amount)');

      let existingTransactions = [];
      try {
        existingTransactions = JSON.parse(fs.readFileSync('filtered_buyShares_transactions.json', 'utf8'));
      } catch (error) {
        console.error('Error reading existing transactions:', error);
      }

      const combinedTransactions = [...filteredByFunction, ...existingTransactions];
      fs.writeFileSync('filtered_buyShares_transactions.json', JSON.stringify(combinedTransactions, null, 2));
      console.log('Filtered buyShares transactions saved to filtered_buyShares_transactions.json');
    } else {
      console.log(`Error: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    console.error(`Error fetching transactions: ${error}`);
  }
}

app.post('/buyNewCardShares', async (req, res) => {
  const { address, privateKey } = req.body;
  try {
      // Buy 1 share for the specified address
      const shares = 1; // You can change this to buy more shares if needed
      const provider = new ethers.JsonRpcProvider(`https://base-mainnet.g.alchemy.com/v2/Nh7nPKnpk6GGs3YAlxrX1cV-qZQIcW_X`);
      const contractABI = [
          'function buyShares(address arg0, uint256 arg1)',
          'function sellShares(address arg0, uint256 arg1)',
          'function getBuyPriceAfterFee(address sharesSubject, uint256 amount) public view returns (uint256)',
          'function getSellPriceAfterFee(address sharesSubject, uint256 amount) public view returns (uint256)'
      ];
      const contractAddress = '0xCF205808Ed36593aa40a44F10c7f7C2F67d4A4d4';
      const wallet = new ethers.Wallet(privateKey, provider); // Create a wallet with the private key
      const contract = new ethers.Contract(contractAddress, contractABI, wallet); // Use the wallet to interact with the contract

      const buyPrice = await contract.getBuyPriceAfterFee(address, shares);
      const tx = await contract.buyShares(address, shares, {
          value: buyPrice,
      });
      const receipt = await tx.wait();
      res.json({ success: true, receipt });
  } catch (error) {
      res.json({ success: false, error: error.message });
  }
});


// Usage
setInterval(trackAddressTransactions, 2000);



// ... other existing code

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
