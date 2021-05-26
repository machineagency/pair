use std::process::Command;
use std::process::Output;
use svg::node::element::path::{Command, Data};
use svg::node::element::tag::Path;
use svg::parser::Event;

pub struct Axidraw {
    name: String
}

impl Axidraw {
    pub fn new() -> Self {
        Axidraw { name: String::from("axidraw") }
    }
    pub fn plot_box(&self, translate: &Vec2) -> Output {
        self.plot_svg_file("../../box_volatile.svg")
    }
    pub fn plot_wave(&self, translate: &Vec2) -> Output {
        self.plot_svg_file("../../wave_volatile.svg")
    }
    fn plot_svg_file(&self, filename: &'static str) -> Output {
        Command::new("axicli")
                .arg(filename)
                .output()
                .expect("couldn't plot svg file")
    }
}

struct Vec2 {
    x: f64,
    y: f64
}

struct SvgTransformer {
}

impl SvgTransformer {
    fn create_translated_file(filename: &'static str, translate: &Vec2) {
    }
}

pub fn test() {
    let axidraw = Axidraw::new();
    axidraw.plot_box();
}
