// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

contract CertificateRegistry {

    struct Certificate {
        string name;
        string issuer;
        uint256 dateIssued;
    }

    mapping(address => Certificate[]) private certificates;

    // Sertifika ekleme (sadece kontrat sahibi çağırabilir)
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    function addCertificate(address _recipient, string memory _name, string memory _issuer, uint256 _dateIssued) public onlyOwner {
        certificates[_recipient].push(Certificate(_name, _issuer, _dateIssued));
    }

    function getCertificates(address _recipient) public view returns (Certificate[] memory) {
        return certificates[_recipient];
    }
}
