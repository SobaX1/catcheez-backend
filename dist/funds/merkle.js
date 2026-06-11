"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leafOfOwner = leafOfOwner;
exports.merkleVerify = merkleVerify;
exports.selectWinners = selectWinners;
exports.buildWinnerSet = buildWinnerSet;
exports.hexProofToBytes = hexProofToBytes;
/**
 * Catcheez 当選者選定 + Merkle（オンチェーン claim_prize と完全一致）。
 *  - leaf = keccak256(owner の 32byte pubkey)
 *  - 内部ノード = OpenZeppelin 互換 sorted-pair keccak256
 *  - 当選者選定 = fund.randomness を種にした決定的 PRNG で entries 重み・winner_slots 件
 * これらは devnet で検証済みのドライバ実装(onchain-claim-driver.js)と 1:1 で一致する。
 * 一致が崩れると claim_prize が InvalidProof で落ちるため、ロジックは変更しないこと。
 */
const js_sha3_1 = require("js-sha3");
const web3_js_1 = require("@solana/web3.js");
const k = (buf) => Buffer.from(js_sha3_1.keccak_256.arrayBuffer(buf));
const pairHash = (a, b) => Buffer.compare(a, b) <= 0 ? k(Buffer.concat([a, b])) : k(Buffer.concat([b, a]));
/** leaf = keccak256(owner pubkey 32 bytes) */
function leafOfOwner(owner) {
    return k(Buffer.from(new web3_js_1.PublicKey(owner).toBytes()));
}
function buildLayers(leaves) {
    let layer = leaves.slice();
    const layers = [layer];
    while (layer.length > 1) {
        const next = [];
        for (let i = 0; i < layer.length; i += 2) {
            next.push(i + 1 < layer.length ? pairHash(layer[i], layer[i + 1]) : layer[i]);
        }
        layer = next;
        layers.push(layer);
    }
    return layers;
}
function proofForIndex(layers, idx) {
    const proof = [];
    for (let l = 0; l < layers.length - 1; l++) {
        const layer = layers[l];
        const j = idx % 2 === 1 ? idx - 1 : idx + 1;
        if (j < layer.length)
            proof.push(layer[j]);
        idx = Math.floor(idx / 2);
    }
    return proof;
}
/** オンチェーン merkle_verify と同じ検証（自己テスト用）。 */
function merkleVerify(proof, root, leaf) {
    let computed = leaf;
    for (const p of proof)
        computed = pairHash(computed, p);
    return Buffer.compare(computed, root) === 0;
}
/** randomness(32B) を種にした決定的 PRNG。 */
function rng(seed32) {
    let h = k(Buffer.from(seed32));
    let i = 0;
    return () => {
        if (i >= 8) {
            h = k(h);
            i = 0;
        }
        const v = h.readUInt32BE(i * 4);
        i++;
        return v / 0xffffffff;
    };
}
/** entries 重み・非復元抽出で count 件を決定的に選ぶ。 */
function selectWinners(parts, count, randomness) {
    const next = rng(randomness);
    const pool = parts.slice();
    const chosen = [];
    count = Math.min(count, pool.length);
    for (let n = 0; n < count; n++) {
        const total = pool.reduce((a, it) => a + (it.entries || 1), 0);
        let r = next() * total;
        let idx = 0;
        for (; idx < pool.length; idx++) {
            r -= (pool[idx].entries || 1);
            if (r <= 0)
                break;
        }
        if (idx >= pool.length)
            idx = pool.length - 1;
        chosen.push(pool[idx]);
        pool.splice(idx, 1);
    }
    return chosen;
}
/** 当選者集合から root と owner 別 proof を生成。 */
function buildWinnerSet(winners) {
    const leaves = winners.map((w) => leafOfOwner(w.owner));
    const layers = buildLayers(leaves);
    const root = layers[layers.length - 1][0] || Buffer.alloc(32);
    const proofs = {};
    winners.forEach((w, i) => {
        const pf = proofForIndex(layers, i);
        // 自己検証（万一の不一致を保存前に検知）
        if (!merkleVerify(pf, root, leaves[i])) {
            throw new Error('internal merkle proof mismatch for ' + w.owner);
        }
        proofs[w.owner] = pf.map((b) => '0x' + b.toString('hex'));
    });
    return { winners, rootHex: '0x' + root.toString('hex'), proofs };
}
/** '0x..' hex を number[]（32 要素）へ。フロントの claimPrize(proof) 用。 */
function hexProofToBytes(proofHex) {
    return proofHex.map((h) => Array.from(Buffer.from(h.replace(/^0x/, ''), 'hex')));
}
//# sourceMappingURL=merkle.js.map