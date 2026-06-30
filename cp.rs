use std::env; use std::fs; fn main() { let args: Vec<String> = env::args().collect(); if args.len() == 3 { fs::copy(&args[1], &args[2]).unwrap(); } }
