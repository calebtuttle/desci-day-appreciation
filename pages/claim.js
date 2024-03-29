import Head from 'next/head'
import Link from 'next/link'
import ConnectTopBar from './components/ConnectTopBar'
import styles from '../styles/Home.module.css'
// import styles from '../styles/tailwind.css'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers';

import Container from './components/Container'
import Header from './components/Header'


const nftDescription = "ETHAmsterdam 2022 DeSci Day NFT"
const nftName = "ETHAmsterdam 2022 DeSci Day NFT"
const nftExternalUrl = "https://gratitude.desci.community"

const switchNetwork = async () => {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{
          chainId: "0x64",
      }]
    });
  } catch(e) {
    if (e.code === 4001) {
      window.alert('Please switch to the GNOSIS chain.')
    }
  }
};

const getSigner = async () => {
  const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
  // Prompt user for account connections
  console.log('in signer');
  try {
    await switchNetwork();
    await provider.send("eth_requestAccounts", []);
  } catch(e) {
      if (e.code === -32002) {
        window.alert('You already initiated a connection. Please open your metamask and approve any pending transactions from us.')
      }
  }
  const signer = provider.getSigner();
  try {
    const address = await signer.getAddress();
    console.log("Account:", address);
  } catch(e) {
    //TODO
  }
  return signer;
}

export default function PageWithJSbasedForm() {
  const [signer, setSigner] = useState()
  const [address, setAddress] = useState()
  const [userInput, setUserInput] = useState("")

  useEffect(() => {
    if (signer) {
      signer.getAddress().then(_address => setAddress(_address))
    }
  }, [signer])

  const handleSubmit = async (event) => {
    event.preventDefault()

    const name = event.target.name.value
    const address = await signer.getAddress()
    const location = event.target.location.value
    const message = event.target.message.value

    if (!signer) {
      getSigner().then(_signer => setSigner(_signer));
    }
    const contractAddr = '0xD73b048697Cd68cb9c5b534f890F915452191D1A'
    // const contractABI = require('../../data/abi/AppreciationToken.json')
    const contractABI = require('./AppreciationToken.json')
    const contractWithSigner = new ethers.Contract(contractAddr, contractABI, signer)
    
    let pinCidsBefore;
    console.log('GET https://api.pinata.cloud/data/pinList')
    fetch('https://api.pinata.cloud/data/pinList', {
      method: 'GET',
      headers: {
        pinata_api_key: process.env.NEXT_APP_PINATA_API_KEY,
        pinata_secret_api_key: process.env.PINATA_SECRET_API_KEY,
      },
    })
      .then(resp => resp.json())
      .then(pinList => {
        console.log('Successful request: GET https://api.pinata.cloud/data/pinList')
        pinCidsBefore = pinList['rows'].map(item => item.ipfs_pin_hash)
      })
      .catch(err => console.log('Failed request: GET https://api.pinata.cloud/data/pinList'))

    const tulipIndex = await contractWithSigner.getNextTokenImageId()

    const data = {
      description: nftDescription,
      name: nftName,
      external_url: nftExternalUrl,
      image: `ipfs://${require('./TulipCids.json')[tulipIndex]}`,
      attributes: [
        { "trait_type": "name",  "value": name }, 
        { "trait_type": "location", "value": location }, 
        { "trait_type": "message", "value": message }
      ]
    }
    console.log('metadata as object...')
    console.log(data)
    const formData  = new FormData();
    formData.append("data", data);
    console.log('POST https://api.pinata.cloud/pinning/pinFileToIPFS')
    fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: "POST",
      headers: {
        pinata_api_key: process.env.NEXT_APP_PINATA_API_KEY,
        pinata_secret_api_key: process.env.PINATA_SECRET_API_KEY,
      },
      body: formData
    })
    .catch(err => {
      console.log(err)
      console.log('Failed request: POST https://api.pinata.cloud/pinning/pinFileToIPFS')
    })

    let pinCidsAfter;
    fetch('https://api.pinata.cloud/data/pinList', {
      method: 'GET',
      headers: {
        pinata_api_key: process.env.NEXT_APP_PINATA_API_KEY,
        pinata_secret_api_key: process.env.PINATA_SECRET_API_KEY,
      },
    })
      .then(data => data.json())
      .then(pinList => {
        console.log('Successful request: GET https://api.pinata.cloud/data/pinList')
        pinCidsAfter = pinList['rows'].map(item => item.ipfs_pin_hash)
      })
      .catch(err => console.log('Failed request: GET https://api.pinata.cloud/data/pinList'))
    let metadataURI = `ipfs://${pinCidsAfter.filter(x => !pinCidsBefore.includes(x))[0]}`;

    const tx = await contractWithSigner.mintTo(address, metadataURI)
    alert(`You successfully claimed your NFT! Transaction hash: ${tx.hash}`)
  }

  return (
    <div>
    <ConnectTopBar
      onClickConnect={() => {
        getSigner().then(_signer => setSigner(_signer));
      }}
      onClickFaucet={() => {
        window.open('https://www.gimlu.com/faucet')
      }}
    />
    <Container>
      <div
        className="relative px-1 py-10 bg-gray-50 shadow-lg sm:rounded-3xl sm:p-20"
      >
        <Header />
        <div>
          <main>
            <div
              v-if="!loading && !fielding.msg.txHash && !fielding.msg.alert"
              className="sm:m-5 mx-5 grid justify-items-center"
            >
              <form onSubmit={handleSubmit}>
                <p> 👤 Name</p>
                <input className="border-2" type="text" name="name" required />
                <p> 🚩 Location</p>
                <input className="border-2" type="text" name="location" required />
                <p> 💝 Message</p>
                <div>
                  <textarea
                    className="border-2"
                    name="message"
                    value={userInput}
                    onChange={() => setUserInput(event.target.value)}
                    cols="40" rows="5"
                    required
                  ></textarea>
                </div>
                <div
                  className="animate-pulse text-sm bg-gradient-to-r from-blue-50 via-blue-100 to-blue-50 py-5 px-5 shadow-md rounded-xl m-5 ring-4 ring-blue-100 font-lato font-light"
                >
                  <button  className="font-sans text-lg" type="submit"><font size="4.5">Record Your Message</font></button>
                </div>
              </form>
            </div>
          </main>
        </div>
                <p>🌷 Minted? <a href={`https://epor.io/${address}?network=xDai`}>View your tulip</a></p>
        <Link href="/messages" passHref>
          <a target="_blank">
            <div className="font-sans cursor-pointer p-2" >
              <button className="sm:p-0 pt-2 float-right text-sm sm:text-base bg-gray-50 font-fancy border-opacity-50 border-dashed border-b-2 border-gray-900">
                View Tokens of Appreciation
              </button>
            </div>
          </a>
        </Link>
        <div
          className="pt-5 card-footer bottom-0 sm:absolute sm:bottom-4 sm:pt-10 sm:mt-3"
        >
          <div className="font-sans text-gray-400 text-sm sm:text-center">
            <span>
              Design & code by
            </span>
            <a href="https://twitter.com/anggxyz/" target="_new">
              @anggxyz
            </a>, adapted by the DeSci Community
          </div>
        </div>
      </div>
    </Container>
    </div>
  )
}
