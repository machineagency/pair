use std::process::Command;
use std::process::Output;

pub struct Axidraw {
    name: String
}

impl Axidraw {
    pub fn new() -> Self {
        Axidraw { name: String::from("axidraw") }
    }
    pub fn plot_box(&self, translate: &(f64, f64)) -> Output {
        self.plot_svg_file("../../box_volatile.svg")
    }
    pub fn plot_wave(&self, translate: &(f64, f64)) -> Output {
        self.plot_svg_file("../../wave_volatile.svg")
    }
    fn plot_svg_file(&self, filename: &'static str) -> Output {
        Command::new("axicli")
                .arg(filename)
                .output()
                .expect("couldn't plot svg file")
    }
}

pub fn test() {
}
