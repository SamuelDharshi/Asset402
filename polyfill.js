const fs = require('fs');
const path = 'd:/Casper/contracts/asset_registry/wasm/AssetRegistry.wat';
let wat = fs.readFileSync(path, 'utf8');

wat = wat.replace(/\bmemory\.copy\b/g, 'call $polyfill_memory_copy');
wat = wat.replace(/\bmemory\.fill\b/g, 'call $polyfill_memory_fill');

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

const lastParen = wat.lastIndexOf(')');
wat = wat.substring(0, lastParen) + polyfills + wat.substring(lastParen);

fs.writeFileSync(path, wat);
console.log('Polyfilled!');
