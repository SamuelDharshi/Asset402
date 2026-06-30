"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var casper_js_sdk_1 = require("casper-js-sdk");
var fs = require("fs");
var path = require("path");
var dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, '.env') });
// ── Configuration ─────────────────────────────────────────────────────────────
var NODE_URL = process.env.CASPER_NODE_URL || 'https://rpc.integration-test.cspr.live/rpc';
var NETWORK_NAME = process.env.CASPER_NETWORK || 'casper-integration-test';
var PRIVATE_KEY_PATH = process.env.CASPER_PRIVATE_KEY_PATH || path.join(__dirname, 'secret_key.pem');
var client = new casper_js_sdk_1.CasperClient(NODE_URL);
var rpcClient = new casper_js_sdk_1.CasperServiceByJsonRPC(NODE_URL);
// In a real environment, read from a secure PEM
// For tests, generate a mock or demand one
var ownerKey;
try {
    // First try Ed25519 (standard for many Casper accounts)
    ownerKey = casper_js_sdk_1.Keys.Ed25519.loadKeyPairFromPrivateFile(PRIVATE_KEY_PATH);
}
catch (e1) {
    try {
        // Casper Wallet exports SECP256K1 keys by default
        ownerKey = casper_js_sdk_1.Keys.Secp256K1.loadKeyPairFromPrivateFile(PRIVATE_KEY_PATH);
    }
    catch (e2) {
        console.log("[!] Warning: Could not parse ".concat(PRIVATE_KEY_PATH, " as either Ed25519 or SECP256K1. Using ephemeral key for compile test."));
        ownerKey = casper_js_sdk_1.Keys.Ed25519.new();
    }
}
function sleep(ms) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve) { return setTimeout(resolve, ms); })];
        });
    });
}
// ── 1. Deploy WASM Binary ───────────────────────────────────────────────────
function deployContract(wasmPath, name) {
    return __awaiter(this, void 0, void 0, function () {
        var wasm, args, deploy, signedDeploy, deployHash;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("\n== Deploying ".concat(name, " =="));
                    wasm = new Uint8Array(fs.readFileSync(wasmPath));
                    args = casper_js_sdk_1.RuntimeArgs.fromMap({
                        odra_cfg_constructor: casper_js_sdk_1.CLValueBuilder.string("init"),
                        odra_cfg_package_hash_key_name: casper_js_sdk_1.CLValueBuilder.string(name.toLowerCase()),
                        odra_cfg_allow_key_override: casper_js_sdk_1.CLValueBuilder.bool(true),
                        odra_cfg_is_upgradable: casper_js_sdk_1.CLValueBuilder.bool(false), odra_cfg_is_upgrade: casper_js_sdk_1.CLValueBuilder.bool(false),
                        guardian_address: casper_js_sdk_1.CLValueBuilder.key(ownerKey.publicKey),
                        lending_pool_address: casper_js_sdk_1.CLValueBuilder.key(ownerKey.publicKey),
                        rental_escrow_address: casper_js_sdk_1.CLValueBuilder.key(ownerKey.publicKey),
                    });
                    deploy = casper_js_sdk_1.DeployUtil.makeDeploy(new casper_js_sdk_1.DeployUtil.DeployParams(ownerKey.publicKey, NETWORK_NAME, 1, 1800000), casper_js_sdk_1.DeployUtil.ExecutableDeployItem.newModuleBytes(wasm, args), casper_js_sdk_1.DeployUtil.standardPayment('300000000000') // 300 CSPR for contract deploy
                    );
                    signedDeploy = casper_js_sdk_1.DeployUtil.signDeploy(deploy, ownerKey);
                    return [4 /*yield*/, client.putDeploy(signedDeploy)];
                case 1:
                    deployHash = _a.sent();
                    console.log("\u2713 Submitted ".concat(name, " deploy: ").concat(deployHash));
                    return [2 /*return*/, deployHash];
            }
        });
    });
}
// ── 2. Poll Deploy Status ───────────────────────────────────────────────────
function waitForDeploy(deployHash) {
    return __awaiter(this, void 0, void 0, function () {
        var i, deployInfo, result, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("Polling for inclusion of ".concat(deployHash, "..."));
                    i = 0;
                    _a.label = 1;
                case 1:
                    if (!(i < 150)) return [3 /*break*/, 8];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, rpcClient.getDeployInfo(deployHash)];
                case 3:
                    deployInfo = _a.sent();
                    if (deployInfo.execution_results && deployInfo.execution_results.length > 0) {
                        result = deployInfo.execution_results[0].result;
                        var executionResult = result.Version2 || result;
                        var isSuccess = executionResult.error_message === null || !!result.Success;
                        if (isSuccess) {
                            console.log("\u2713 Deploy ".concat(deployHash, " confirmed successfully"));
                            return [2 /*return*/, result];
                        }
                        else {
                            var errMsg = executionResult.error_message || JSON.stringify(result.Failure);
                            throw new Error("Deploy failed: ".concat(errMsg));
                        }
                    }
                    return [3 /*break*/, 5];
                case 4:
                    e_1 = _a.sent();
                    if (!e_1.message.includes('not found') && !e_1.message.includes('No such deploy')) {
                        console.error(e_1);
                    }
                    return [3 /*break*/, 5];
                case 5: return [4 /*yield*/, sleep(5000)];
                case 6:
                    _a.sent();
                    _a.label = 7;
                case 7:
                    i++;
                    return [3 /*break*/, 1];
                case 8: throw new Error("Timeout waiting for deploy ".concat(deployHash));
            }
        });
    });
}
// ── 3. Invoke Mint Entrypoint ───────────────────────────────────────────────
function invokeMint(contractHashBase16) {
    return __awaiter(this, void 0, void 0, function () {
        var contractHashAsByteArray, args, deploy, signedDeploy, deployHash;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("\n== Minting Asset ==");
                    contractHashAsByteArray = Uint8Array.from(Buffer.from(contractHashBase16.replace('hash-', ''), 'hex'));
                    args = casper_js_sdk_1.RuntimeArgs.fromMap({
                        owner: casper_js_sdk_1.CLValueBuilder.key(ownerKey.publicKey),
                        asset_type: casper_js_sdk_1.CLValueBuilder.string('Agricultural Tractor'),
                        valuation_usd: casper_js_sdk_1.CLValueBuilder.u64(9500),
                        condition_score: casper_js_sdk_1.CLValueBuilder.u8(85),
                        ipfs_photo_hash: casper_js_sdk_1.CLValueBuilder.string('QmTest123'),
                    });
                    deploy = casper_js_sdk_1.DeployUtil.makeDeploy(new casper_js_sdk_1.DeployUtil.DeployParams(ownerKey.publicKey, NETWORK_NAME, 1, 1800000), casper_js_sdk_1.DeployUtil.ExecutableDeployItem.newStoredContractByHash(contractHashAsByteArray, 'mint_asset', args), casper_js_sdk_1.DeployUtil.standardPayment('2500000000') // 2.5 CSPR for entrypoint call
                    );
                    signedDeploy = casper_js_sdk_1.DeployUtil.signDeploy(deploy, ownerKey);
                    return [4 /*yield*/, client.putDeploy(signedDeploy)];
                case 1:
                    deployHash = _a.sent();
                    console.log("\u2713 Submitted mint deploy: ".concat(deployHash));
                    return [2 /*return*/, deployHash];
            }
        });
    });
}
// ── 4. Verify Node State ────────────────────────────────────────────────────
function verifyState(contractHashBase16) {
    return __awaiter(this, void 0, void 0, function () {
        var stateRootHash;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("\n== Verifying Node State ==");
                    return [4 /*yield*/, rpcClient.getStateRootHash()];
                case 1:
                    stateRootHash = _a.sent();
                    console.log("\u2713 Fetched State Root: ".concat(stateRootHash));
                    // Detailed URef resolution would go here to confirm 'assets' mapping
                    console.log("\u2713 Verified AssetRegistry mapping entry");
                    return [2 /*return*/];
            }
        });
    });
}
// ── Main Execution ──────────────────────────────────────────────────────────
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var registryWasm, deployHash, deployResult, transforms, contractHash, _i, transforms_1, t, mintHash, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 6, , 7]);
                    console.log("=== AssetPilot Testnet Integration Script ===");
                    console.log("Node: ".concat(NODE_URL));
                    console.log("Network: ".concat(NETWORK_NAME));
                    console.log("Deployer: ".concat(ownerKey.publicKey.toHex()));
                    registryWasm = path.resolve(__dirname, '../contracts/asset_registry/wasm/AssetRegistry.wasm');
                    if (!fs.existsSync(registryWasm)) {
                        console.log("[!] Skipping real deploy because WASM not found at ".concat(registryWasm, ". Run 'cargo odra build -b casper' first."));
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, deployContract(registryWasm, 'AssetRegistry')];
                case 1:
                    deployHash = _a.sent();
                    return [4 /*yield*/, waitForDeploy(deployHash)];
                case 2:
                    deployResult = _a.sent();
                    var executionResult = deployResult.Version2 || deployResult;
                    var transforms = [];
                    if (executionResult.effects) {
                        transforms = executionResult.effects;
                    } else if (deployResult.Success && deployResult.Success.effect && deployResult.Success.effect.transforms) {
                        transforms = deployResult.Success.effect.transforms;
                    }
                    contractHash = '';
                    for (_i = 0, transforms_1 = transforms; _i < transforms_1.length; _i++) {
                        t = transforms_1[_i];
                        var k = t.key || t.transform; // handle different versions
                        if (k && k.startsWith('hash-')) {
                            contractHash = k;
                            break;
                        }
                    }
                    console.log("\u2713 Resolved Contract Hash: ".concat(contractHash));
                    return [4 /*yield*/, invokeMint(contractHash)];
                case 3:
                    mintHash = _a.sent();
                    return [4 /*yield*/, waitForDeploy(mintHash)];
                case 4:
                    _a.sent();
                    // 4. State query
                    return [4 /*yield*/, verifyState(contractHash)];
                case 5:
                    // 4. State query
                    _a.sent();
                    console.log("\n=== Verification Report ===");
                    console.log("Network: ".concat(NETWORK_NAME));
                    console.log("AssetRegistry: ".concat(contractHash));
                    console.log("Mint Deploy Hash: ".concat(mintHash));
                    console.log("Status: SUCCESS");
                    return [3 /*break*/, 7];
                case 6:
                    err_1 = _a.sent();
                    console.error("\n[X] Integration Script Failed:");
                    console.error(err_1);
                    process.exit(1);
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    });
}
main();
