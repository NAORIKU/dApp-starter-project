import React, { useEffect, useState } from "react";
import "./App.css";
/* ethers 変数を使えるようにする*/
import { ethers } from "ethers";
/* ABIファイルを含むWavePortal.jsonファイルをインポートする*/
import abi from "./utils/WavePortal.json";
const App = () => {
  /* ユーザーのパブリックウォレットを保存するために使用する状態変数を定義します */
  const [currentAccount, setCurrentAccount] = useState("");
  /* ユーザーのメッセージを保存するために使用する状態変数を定義 */
  const [messageValue, setMessageValue] = useState("");
  /* すべてのwavesを保存する状態変数を定義 */
  const [allWaves, setAllWaves] = useState([]);
  console.log("currentAccount: ", currentAccount);
  /*
   * デプロイされたコントラクトのアドレスを保持する変数を作成
   */
  const contractAddress = "0xFAE318D7ddDe5C2BAC489481A9d3a7bFd0Ae236e";
  /*
   * ABIの内容を参照する変数を作成
   */
  const contractABI = abi.abi;

  const checkIfWalletIsConnected = async () => {
    const { ethereum } = window;
    try {
      if (!ethereum) {
        console.log("Make sure you have MetaMask!");
      } else {
        console.log("We have the ethereum object", ethereum);
      }
      /* ユーザーのウォレットへのアクセスが許可されているかどうかを確認します */
      const accounts = await ethereum.request({ method: "eth_accounts" });
      if (accounts.length !== 0) {
        const [ account ] = accounts;
        console.log("Found an authorized account:", account);
        setCurrentAccount(account);
        getAllWaves();
      } else {
        console.log("No authorized account found");
      }
    } catch (error) {
      console.log(error);
    }
  };
  // connectWalletメソッドを実装
  const connectWallet = async () => {
    const { ethereum } = window;
    try {
      if(!ethereum) {
        alert("Get MetaMask!");
        return;
      }
      const [ account ] = await ethereum.request({
        method: "eth_requestAccounts",
      });
      console.log("Connected: ", account);
      setCurrentAccount(account);
    } catch (error) {
      console.log(error);
    }
  }

  const wave = async () => {
    const { ethereum } = window;
    try {
      if(!ethereum) {
        console.log("Ethereum object doesn't exist!");
        return;
      }
      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();
      const wavePortalContract = new ethers.Contract(
          contractAddress,
          contractABI,
          signer
      );
      let count = await wavePortalContract.getTotalWaves();
      console.log("Retrieved total wave count...", count.toNumber());
      console.log("Signer:", signer);
      /*
       * コントラクトに👋（wave）を書き込む。ここから...
       */
      const waveTxn = await wavePortalContract.wave(messageValue, {
        gasLimit: 300000,
      });
      console.log("Mining...", waveTxn.hash);
      await waveTxn.wait();
      console.log("Mined -- ", waveTxn.hash);
      count = await wavePortalContract.getTotalWaves();
      console.log("Retrieved total wave count...", count.toNumber());
      let contractBalance = await provider.getBalance(wavePortalContract.address);
      console.log("Contract balance:", ethers.utils.formatEther(contractBalance));
      let contractBalance_post = await provider.getBalance(
          wavePortalContract.address
      );
      /* コントラクトの残高が減っていることを確認 */
      if (contractBalance_post.lt(contractBalance)) {
        /* 減っていたら下記を出力 */
        console.log("User won ETH!");
      } else {
        console.log("User didn't win ETH.");
      }
      console.log(
          "Contract balance after wave:",
          ethers.utils.formatEther(contractBalance_post)
      );
      /*-- ここまで --*/
    } catch (error) {
      console.error(error);
    }
  }

  const getAllWaves = async () => {
    const { ethereum } = window;

    try {
      if(!ethereum) {
        console.log("Ethereum object doesn't exist!");
        return;
      }
      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();
      const wavePortalContract = new ethers.Contract(
          contractAddress,
          contractABI,
          signer
      );
      /* コントラクトからgetAllWavesメソッドを呼び出す */
      const waves = await wavePortalContract.getAllWaves();
      /* UIに必要なのは、アドレス、タイムスタンプ、メッセージだけなので、以下のように設定 */
      const wavesCleaned = waves.map((wave) => {
        return {
          address: wave.waver,
          timestamp: new Date(wave.timestamp * 1000),
          message: wave.message,
        };
      });
      /* React Stateにデータを格納する */
      setAllWaves(wavesCleaned);
    } catch (error) {
      console.error(error);
    }
  }

  /*
   * WEBページがロードされたときに下記の関数を実行します。
   */
  useEffect(() => {
    checkIfWalletIsConnected();
  }, []);

  /*
   * `emit`されたイベントに反応する
   */
  useEffect(() => {
    let wavePortalContract;
    const onNewWave = (from, timestamp, message) => {
      console.log("NewWave", from, timestamp, message);
      setAllWaves((prevState) => [
        ...prevState,
        {
          address: from,
          timestamp: new Date(timestamp * 1000),
          message: message,
        },
      ]);
    }
    const { ethereum } = window;
    if(ethereum) {
      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();

      wavePortalContract = new ethers.Contract(
          contractAddress,
          contractABI,
          signer
      );
      wavePortalContract.on("NewWave", onNewWave);
    }
    /*メモリリークを防ぐために、NewWaveのイベントを解除します*/
    return () => {
      if (wavePortalContract) {
        wavePortalContract.off("NewWave", onNewWave);
      }
    }
  }, [])

  return (
      <div className="mainContainer">
        <div className="dataContainer">
          <div className="header">
          <span role="img" aria-label="hand-wave">
            👋
          </span>{" "}
            WELCOME!
          </div>
          <div className="bio mb-5">
            イーサリアムウォレットを接続して、メッセージを作成したら、「
            <span role="img" aria-label="hand-wave">
            👋
          </span>
            (wave)」を送ってください
            <span role="img" aria-label="shine">
            ✨
          </span>
          </div>
          {/* メッセージボックスを実装*/}
          {currentAccount && (
              <textarea
                  className="p-3 block w-full rounded-md border border-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  name="messageArea"
                  placeholder="メッセージはこちら"
                  type="text"
                  id="message"
                  value={messageValue}
                  onChange={(e) => setMessageValue(e.target.value)}
              />
          )}
          {/* ウォレットコネクトのボタンを実装 */}
          {!currentAccount && (
              <button className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2" onClick={connectWallet}>
                Connect Wallet
              </button>
          )}
          {/* waveボタンにwave関数を連動させる。*/}
          {currentAccount && (
              <button className="mt-3 flex w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2" onClick={wave}>
                Wave at Me
              </button>
          )}
          {currentAccount && (
              <button className="mt-3 flex w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2" onClick={connectWallet}>
                Wallet Connected
              </button>
          )}
          {/* 履歴を表示する */}
          {currentAccount &&
          <div className="flow-root">
            <ul className="mt-6">
              {allWaves
                  .slice(0)
                  .reverse()
                  .map((wave, index) => {
                    return (
                        <li
                            key={index}>
                          <div className="relative pb-8">
                            {index !== allWaves.length - 1 && <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />}
                            <div className="relative flex space-x-3">
                              <div>
                                <span className="h-8 w-8 rounded-full bg-gray-400 flex items-center justify-center ring-8 ring-white">
                                  <svg className="h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
                                       fill="currentColor" aria-hidden="true">
                                    <path
                                        d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z"/>
                                  </svg>
                                </span>
                              </div>
                              <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                <div>
                                  <p className="text-sm text-gray-500">{wave.message} <br /> {wave.address}</p>
                                </div>
                                <div className="whitespace-nowrap text-right text-sm text-gray-500">
                                  <time dateTime={wave.timestamp.toString()}>{wave.timestamp.toLocaleString()}</time>
                                </div>
                              </div>
                              {/*<div>Address: {wave.address}</div>*/}
                            </div>
                          </div>
                        </li>
                    );
                  })}
            </ul>
          </div>
          }
        </div>
      </div>
  )
}

export default App;