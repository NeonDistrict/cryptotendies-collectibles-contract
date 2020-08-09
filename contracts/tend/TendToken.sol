// SPDX-License-Identifier: MIT

/**
 *
 * note: several functions here are overriden, this contract is NOT
 * meant to be used in production, it is a modified version of the
 * Tendies contract used on mainnet, and it is only intended for
 * testing functions in the wrapper / proxy contract(s).
 *
 **/

pragma solidity ^0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./TendERC20.sol";

interface IUniswapV2Pair {
    function sync() external;
}

interface IUniswapV2Factory {
    function createPair(address tokenA, address tokenB) external returns (address pair);
}

/*                                        _
                               .-.  .--''` )
                            _ |  |/`   .-'`
                           ( `\      /`
                           _)   _.  -'._
                         /`  .'     .-.-;
                         `).'      /  \  \
                        (`,        \_o/_o/__
                         /           .-''`  ``'-.
                         {         /` ,___.--''`
                         {   ;     '-. \ \
       _   _             {   |'-....-`'.\_\
      / './ '.           \   \          `"`
   _  \   \  |            \   \
  ( '-.J     \_..----.._ __)   `\--..__
 .-`                    `        `\    ''--...--.
(_,.--""`/`         .-             `\       .__ _)
        |          (                 }    .__ _)
        \_,         '.               }_  - _.'
           \_,         '.            } `'--'
              '._.     ,_)          /
                 |    /           .'
                  \   |    _   .-'
                   \__/;--.||-'
                    _||   _||__   __
             _ __.-` "`)(` `"  ```._)
    TENDIES  (_`,-   ,-'  `''-.   '-._)
           (  (    /          '.__.'
            `"`'--'
*/
contract TendToken is TendERC20, Ownable {
    using SafeMath for uint256;

    // GRILL

    uint256 public lastGrillTime;

    uint256 public totalGrilled;

    uint256 public constant GRILL_RATE = 4; // grill rate per day (4%)

    uint256 public constant GRILL_REWARD = 1;

    // REWARDS

    uint256 public constant POOL_REWARD = 48;

    uint256 public lastRewardTime;

    uint256 public rewardPool;

    mapping (address => uint256) public claimedRewards;

    mapping (address => uint256) public unclaimedRewards;

    // mapping of top holders that owner update before paying out rewards
    mapping (uint256 => address) public topHolder;

    // maximum of top topHolder
    uint256 public constant MAX_TOP_HOLDERS = 50;

    uint256 internal totalTopHolders;

    // Pause for allowing tokens to only become transferable at the end of sale

    address public pauser;

    bool public paused;

    // UNISWAP

    TendERC20 internal WETH = TendERC20(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);

    IUniswapV2Factory public uniswapFactory = IUniswapV2Factory(0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f);

    address public uniswapPool;

    // MODIFIERS

    modifier onlyPauser() {
        require(pauser == _msgSender(), "TendToken: caller is not the pauser.");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "TendToken: paused");
        _;
    }

    modifier when3DaysBetweenLastSnapshot() {
        require((now - lastRewardTime) >= 3 days, "TendToken: not enough days since last snapshot taken.");
        _;
    }

    // EVENTS

    event PoolGrilled(address tender, uint256 grillAmount, uint256 newTotalSupply, uint256 newUniswapPoolSupply, uint256 userReward, uint256 newPoolReward);

    event PayoutSnapshotTaken(uint256 totalTopHolders, uint256 totalPayout, uint256 snapshot);

    event PayoutClaimed(address indexed topHolderAddress, uint256 claimedReward);

    constructor(uint256 initialSupply)
    public
    Ownable()
    TendERC20("Tendies Token", "TEND")
    {
        _mint(msg.sender, initialSupply);
        setPauser(msg.sender);
        paused = true;
    }

    function setUniswapPool() external onlyOwner {
        require(uniswapPool == address(0), "TendToken: pool already created");
        uniswapPool = uniswapFactory.createPair(address(WETH), address(this));
    }

    // OVERRIDE: DNE in original contract
    function overrideUniswapPool(address _addr) external {
        uniswapPool = _addr;
    }

    // PAUSE

    function setPauser(address newPauser) public onlyOwner {
        require(newPauser != address(0), "TendToken: pauser is the zero address.");
        pauser = newPauser;
    }

    function unpause() external onlyPauser {
        paused = false;

        // Start grilling
        lastGrillTime = now;
        lastRewardTime = now;
        rewardPool = 0;
    }

    // TOKEN TRANSFER HOOK

    function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual override {
        super._beforeTokenTransfer(from, to, amount);
        require(!paused || msg.sender == pauser, "TendToken: token transfer while paused and not pauser role.");
    }

    // GRILLERS

    function getInfoFor(address addr) public view returns (uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256) {
        return (
            balanceOf(addr),
            claimedRewards[addr],
            balanceOf(uniswapPool),
            _totalSupply,
            totalGrilled,
            getGrillAmount(),
            lastGrillTime,
            lastRewardTime,
            rewardPool
        );
    }

    // OVERRIDE: this function DNE on original contract
    function addToUniswapPool() external {
        _totalSupply = _totalSupply.add(100000000 * 1e18);
        _balances[uniswapPool] = _balances[uniswapPool].add(100000000 * 1e18);
    }

    // OVERRIDE: this function DNE on original contract
    function drainUniswapPool() external {
        _totalSupply = _totalSupply.sub(_balances[uniswapPool]);
        _balances[uniswapPool] = 0;
    }

    function grillPool() external {
        uint256 grillAmount = getGrillAmount();
        require(grillAmount >= 1 * 1e18, "grillPool: min grill amount not reached.");

        // Reset last grill time
        lastGrillTime = now;

        uint256 userReward = grillAmount.mul(GRILL_REWARD).div(100);
        uint256 poolReward = grillAmount.mul(POOL_REWARD).div(100);
        uint256 finalGrill = grillAmount.sub(userReward).sub(poolReward);

        _totalSupply = _totalSupply.sub(finalGrill);
        _balances[uniswapPool] = _balances[uniswapPool].sub(grillAmount);

        totalGrilled = totalGrilled.add(finalGrill);
        rewardPool = rewardPool.add(poolReward);

        _balances[msg.sender] = _balances[msg.sender].add(userReward);

        // OVERRIDE
        //IUniswapV2Pair(uniswapPool).sync();

        emit PoolGrilled(msg.sender, grillAmount, _totalSupply, balanceOf(uniswapPool), userReward, poolReward);
    }

    function getGrillAmount() public view returns (uint256) {
        if (paused) return 0;
        uint256 timeBetweenLastGrill = now - lastGrillTime;
        uint256 tokensInUniswapPool = balanceOf(uniswapPool);
        uint256 dayInSeconds = 1 days;
        return (tokensInUniswapPool.mul(GRILL_RATE)
            .mul(timeBetweenLastGrill))
            .div(dayInSeconds)
            .div(100);
    }

    // Rewards

    function updateTopHolders(address[] calldata holders) external onlyOwner when3DaysBetweenLastSnapshot {
        totalTopHolders = holders.length < MAX_TOP_HOLDERS ? holders.length : MAX_TOP_HOLDERS;

        // Calculate payout and take snapshot
        uint256 toPayout = rewardPool.div(totalTopHolders);
        uint256 totalPayoutSent = rewardPool;
        for (uint256 i = 0; i < totalTopHolders; i++) {
            unclaimedRewards[holders[i]] = unclaimedRewards[holders[i]].add(toPayout);
        }

        // Reset rewards pool
        lastRewardTime = now;
        rewardPool = 0;

        emit PayoutSnapshotTaken(totalTopHolders, totalPayoutSent, now);
    }

    function claimRewards() external {
        require(unclaimedRewards[msg.sender] > 0, "TendToken: nothing left to claim.");

        uint256 unclaimedReward = unclaimedRewards[msg.sender];
        unclaimedRewards[msg.sender] = 0;
        claimedRewards[msg.sender] = claimedRewards[msg.sender].add(unclaimedReward);
        _balances[msg.sender] = _balances[msg.sender].add(unclaimedReward);

        emit PayoutClaimed(msg.sender, unclaimedReward);
    }
}
