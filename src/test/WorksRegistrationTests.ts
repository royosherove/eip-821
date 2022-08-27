import { expect } from "chai";
import { ethers } from "hardhat";
import { SongMintingParamsStruct  } from "../typechain-types/contracts/SongRegNFT";
import { CompositionRoyaltyToken,RecordingRoyaltyToken,RecordingRoyaltyToken__factory,SongRegNFT, SongRegNFT__factory } from "../typechain-types";
import { NewSongEvent, SongLedger } from "../typechain-types/contracts/SongLedger";
import chai from "chai";
import { CompositionRoyaltyToken__factory } from "../typechain-types";
const check = require("./check.js");

describe("Composition", () => {

    it("can deploy song with composition and recording tokens", async function () {
      const [acc0,acc1,acc2,acc3,acc4] = await ethers.getSigners();
      const songLedger = await ethers.getContractFactory("SongLedger");
      const deployedLedger = await songLedger.deploy(acc0.address);
      const mintParams:SongMintingParamsStruct = {
          shortName: "shortName",
          symbol: "SHORT",
          metadataUri: "uri",
          splits:{
            compSplits:[
              { holderAddress: acc2.address, amount: 30, memo:"writer1" },
              { holderAddress: acc3.address, amount: 70, memo:"writer2" },
          ],
            recSplits:[
              { holderAddress: acc2.address, amount: 10, memo:"mastering" },
              { holderAddress: acc3.address, amount: 40, memo:"producer" },
              { holderAddress: acc4.address, amount: 50, memo:"singer" },
            ]
          } ,
      }
      await expect(deployedLedger.mintSong(mintParams))
      .to.emit(deployedLedger,"NewSong");

      //get the event data for NewSong event from the registrar
      const filter = deployedLedger.filters.NewSong();
      const evs = await deployedLedger.queryFilter(filter,0,"latest") as NewSongEvent[];
      const songAddress = evs[0].args.songAddress;
      const compAddress = evs[0].args.compToken;
      const recAddress = evs[0].args.recToken;

      const songInstance = SongRegNFT__factory.connect(songAddress,acc0);
      const compositionRoyaltyInstance = CompositionRoyaltyToken__factory.connect(compAddress,acc0);
      const recordingRoyaltyInstance = RecordingRoyaltyToken__factory.connect(recAddress,acc0);

      ///////////////////////////////////
      //IWorksRegistration interface functions
      ///////////////////////////////////

      //ledger()
      expect(await songInstance.ledger()).to.eq(deployedLedger.address);
      
      //royaltyTokens()
      const foundTokens = await songInstance.royaltyTokens();
      expect(foundTokens).to.contain(recAddress);
      expect(foundTokens).to.contain(compAddress);
      expect(foundTokens.length).to.eq(2);
      
      // metadataURI()
      expect(await songInstance.metadataUri()).to.eq("uri");

      // changeMetadataURI()
      await songInstance.changeMetadataURI("uri2","hash");
      expect(await songInstance.metadataUri()).to.eq("uri2");

      ///////////////////////////////////
      //SongRegistration functions
      ///////////////////////////////////
      //song initial data
      expect(await songInstance.songLedger()).to.eq(deployedLedger.address);
      expect(await songInstance.name()).to.eq("shortName");
      expect(await songInstance.symbol()).to.eq("SHORT");
      expect(await songInstance.tokenId()).to.eq(1);
      
      //song points to rec and comp tokens
      expect(await songInstance.compToken()).to.eq(compAddress);
      expect(await songInstance.recToken()).to.eq(recAddress);
      
      //tokens point to song
      expect(await compositionRoyaltyInstance.parentSong()).to.eq(songAddress);
      expect(await recordingRoyaltyInstance.parentSong()).to.eq(songAddress);

      //token composition splits initial balances
      expect(await compositionRoyaltyInstance.balanceOf(acc2.address)).to.eq(toWei(30));
      expect(await compositionRoyaltyInstance.balanceOf(acc3.address)).to.eq(toWei(70));

      //token recording splits initial balances
      expect(await recordingRoyaltyInstance.balanceOf(acc2.address)).to.eq(toWei(10));
      expect(await recordingRoyaltyInstance.balanceOf(acc3.address)).to.eq(toWei(40));
      expect(await recordingRoyaltyInstance.balanceOf(acc4.address)).to.eq(toWei(50));

      

    });
  });

const toWei = (num:number): any => ethers.BigNumber.from((num * 10 ** 18).toString());


