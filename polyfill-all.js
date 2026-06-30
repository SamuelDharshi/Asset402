const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const contracts = [
  'd:/Casper/contracts/wasm/AssetRegistry',
  'd:/Casper/contracts/wasm/RentalEscrow',
  'd:/Casper/contracts/wasm/LendingPool',
  'd:/Casper/contracts/wasm/FractionalRegistry',
  'd:/Casper/contracts/wasm/CarbonCredit'
];

const polyfills = `
  (func $polyfill_memory_copy (param $dst i32) (param $src i32) (param $len i32)
    (local $i i32)
    (if (i32.lt_u (local.get $dst) (local.get $src))
      (then
        (local.set $i (i32.const 0))
        (loop $copy_forward
          (if (i32.lt_u (local.get $i) (local.get $len))
            (then
              (i32.store8 (i32.add (local.get $dst) (local.get $i)) (i32.load8_u (i32.add (local.get $src) (local.get $i))))
              (local.set $i (i32.add (local.get $i) (i32.const 1)))
              (br $copy_forward)
            )
          )
        )
      )
      (else
        (local.set $i (local.get $len))
        (loop $copy_backward
          (if (i32.gt_u (local.get $i) (i32.const 0))
            (then
              (local.set $i (i32.sub (local.get $i) (i32.const 1)))
              (i32.store8 (i32.add (local.get $dst) (local.get $i)) (i32.load8_u (i32.add (local.get $src) (local.get $i))))
              (br $copy_backward)
            )
          )
        )
      )
    )
  )

  (func $polyfill_memory_fill (param $dst i32) (param $val i32) (param $len i32)
    (local $i i32)
    (local.set $i (i32.const 0))
    (loop $fill_loop
      (if (i32.lt_u (local.get $i) (local.get $len))
        (then
          (i32.store8 (i32.add (local.get $dst) (local.get $i)) (local.get $val))
          (local.set $i (i32.add (local.get $i) (i32.const 1)))
          (br $fill_loop)
        )
      )
    )
  )
`;

for (const c of contracts) {
  const wasmPath = `${c}.wasm`;
  const watPath = `${c}.wat`;

  console.log(`Processing ${path.basename(wasmPath)}...`);

  // 1. Convert to WAT
  execSync(`npx wasm2wat "${wasmPath}" -o "${watPath}"`);

  // 2. Read WAT content
  let wat = fs.readFileSync(watPath, 'utf8');

  // 3. Replace memory.copy and memory.fill
  wat = wat.replace(/\bmemory\.copy\b/g, 'call $polyfill_memory_copy');
  wat = wat.replace(/\bmemory\.fill\b/g, 'call $polyfill_memory_fill');

  // 4. Inject polyfills before the final closing paren
  const lastParen = wat.lastIndexOf(')');
  wat = wat.substring(0, lastParen) + polyfills + wat.substring(lastParen);

  // 5. Write modified WAT
  fs.writeFileSync(watPath, wat);

  // 6. Convert back to WASM
  execSync(`npx wat2wasm "${watPath}" -o "${wasmPath}"`);

  // 7. Cleanup WAT
  fs.unlinkSync(watPath);

  console.log(`✓ Polyfilled ${path.basename(wasmPath)} successfully.`);
}

console.log("All contracts polyfilled.");
