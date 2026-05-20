// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TreasuryPayments is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public treasury;
    mapping(address => bool) public supportedToken;
    mapping(bytes32 => bool) public consumedPayment;

    event PaymentReceived(bytes32 indexed paymentId, address indexed payer, address indexed token, uint256 amount, string purpose);
    event TreasuryUpdated(address indexed treasury);
    event TokenSupportUpdated(address indexed token, bool supported);
    event Withdrawn(address indexed token, address indexed to, uint256 amount);

    constructor(address initialOwner, address initialTreasury) Ownable(initialOwner) {
        require(initialTreasury != address(0), "treasury zero");
        treasury = initialTreasury;
        supportedToken[address(0)] = true;
    }

    receive() external payable {
        emit PaymentReceived(keccak256(abi.encodePacked(msg.sender, block.number, msg.value)), msg.sender, address(0), msg.value, "direct");
    }

    function setTreasury(address nextTreasury) external onlyOwner {
        require(nextTreasury != address(0), "treasury zero");
        treasury = nextTreasury;
        emit TreasuryUpdated(nextTreasury);
    }

    function setSupportedToken(address token, bool supported) external onlyOwner {
        supportedToken[token] = supported;
        emit TokenSupportUpdated(token, supported);
    }

    function payNative(bytes32 paymentId, string calldata purpose) external payable whenNotPaused nonReentrant {
        require(msg.value > 0, "amount zero");
        _consume(paymentId);
        emit PaymentReceived(paymentId, msg.sender, address(0), msg.value, purpose);
    }

    function payToken(bytes32 paymentId, address token, uint256 amount, string calldata purpose) external whenNotPaused nonReentrant {
        require(supportedToken[token], "token unsupported");
        require(amount > 0, "amount zero");
        _consume(paymentId);
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        emit PaymentReceived(paymentId, msg.sender, token, amount, purpose);
    }

    function withdrawNative(uint256 amount) external onlyOwner nonReentrant {
        uint256 value = amount == 0 ? address(this).balance : amount;
        (bool ok, ) = treasury.call{value: value}("");
        require(ok, "withdraw failed");
        emit Withdrawn(address(0), treasury, value);
    }

    function withdrawToken(address token, uint256 amount) external onlyOwner nonReentrant {
        uint256 value = amount == 0 ? IERC20(token).balanceOf(address(this)) : amount;
        IERC20(token).safeTransfer(treasury, value);
        emit Withdrawn(token, treasury, value);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _consume(bytes32 paymentId) internal {
        require(paymentId != bytes32(0), "payment id zero");
        require(!consumedPayment[paymentId], "payment consumed");
        consumedPayment[paymentId] = true;
    }
}
