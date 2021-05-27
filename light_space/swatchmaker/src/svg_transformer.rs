use svg::node::element::path::{Command, Data};
use svg::node::element::tag::Path;
use svg::parser::Event;
use std::fs::File;
use std::io::{Write, BufReader, BufRead, Error};

struct SvgTransformer {
}

impl SvgTransformer {
    fn create_translated_file(filename: &'static str, translate: &(f64, f64)) {
    }
}

pub fn test() {
    let svgt = SvgTransformer { };
}
