// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MediaStore {
    struct Media {
        uint256 id;
        address owner;
        string cid;
        string name;
        uint256 createdAt;
        bool deleted;
    }

    Media[] private items;

    event MediaAdded(uint256 indexed id, address indexed owner, string cid, string name);
    event MediaDeleted(uint256 indexed id, address indexed owner);

    function addMedia(string calldata cid, string calldata name) external returns (uint256 id) {
        require(bytes(cid).length > 0, "cid is empty");
        require(bytes(name).length > 0, "name is empty");

        id = items.length;
        items.push(Media(id, msg.sender, cid, name, block.timestamp, false));

        emit MediaAdded(id, msg.sender, cid, name);
    }

    function deleteMedia(uint256 id) external {
        require(id < items.length, "media not found");

        Media storage item = items[id];
        require(item.owner == msg.sender, "not the owner");
        require(!item.deleted, "already deleted");

        item.deleted = true;

        emit MediaDeleted(id, msg.sender);
    }

    function getMedia() external view returns (Media[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < items.length; i++) {
            if (!items[i].deleted) {
                count++;
            }
        }

        Media[] memory result = new Media[](count);
        uint256 j = 0;
        for (uint256 i = 0; i < items.length; i++) {
            if (!items[i].deleted) {
                result[j++] = items[i];
            }
        }
        return result;
    }

    function getMediaById(uint256 id) external view returns (Media memory) {
        require(id < items.length, "media not found");
        return items[id];
    }
}
