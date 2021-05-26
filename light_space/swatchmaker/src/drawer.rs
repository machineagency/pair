use std::fmt;
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct Path {
    points: Vec<Point>
}

impl Path {
    pub fn new() -> Self {
        Path {
            points: Vec::new()
        }
    }
    pub fn is_empty(&mut self) -> bool {
        self.points.len() == 0
    }
    pub fn add_point(&mut self, x: f32, y: f32) {
        self.points.push(Point::new(x, y));
    }
    pub fn translate(&mut self, tx: f32, ty: f32) {
        for point in self.points.iter_mut() {
            point.translate(tx, ty);
        }
    }
    pub fn make_svg_path(&mut self) -> String {
        let mut path_string = String::new();
        if self.is_empty() {
            return path_string;
        }
        let mut d = String::new();
        d.push_str(&format!("M{} {} ", &self.points[0].x, &self.points[0].y));
        for point in self.points[1..].iter() {
            d.push_str(&format!("L{} {} ", &point.x, &point.y));
        }
        path_string.push_str("<path d=\"");
        path_string.push_str(&d);
        path_string.push_str("\"/>");
        path_string
    }
}

impl fmt::Display for Path {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        let mut s = String::new();
        s.push('<');
        for point in self.points.iter() {
            s.push_str(&point.to_string());
            s.push_str(",");
        }
        s.push('>');
        write!(f, "{}", s)
    }
}

#[derive(Debug, Clone)]
pub struct Point {
    x: f32,
    y: f32
}

impl Point {
    pub fn new(x: f32, y: f32) -> Self {
        Point {
            x: x,
            y: y
        }
    }
    pub fn translate(&mut self, tx: f32, ty: f32) {
       self.x += tx;
       self.y += ty;
    }
}

impl fmt::Display for Point {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "({}, {})", self.x, self.y)
    }
}

pub struct SvgGraph {
    name: String,
    width: f32,
    height: f32,
    paths: Vec<Path>,
    options: HashMap<String, String>
}

impl SvgGraph {
    pub fn new(name: &str, width: f32, height: f32) -> Self {
        SvgGraph {
            name: String::from(name),
            width: width,
            height: height,
            paths: Vec::new(),
            options: HashMap::new()
        }
    }
    pub fn add_path(&mut self, path: &Path) {
        self.paths.push(path.clone());
    }
    pub fn compile(&mut self) -> String {
        let mut s = String::new();
        s.push_str(&self.generate_header());
        s.push_str(&self.generate_title());
        for path in self.paths.iter_mut() {
            s.push_str(&path.make_svg_path());
        }
        s.push_str(&self.generate_footer());
        s
    }
    fn generate_header(&mut self) -> String {
        format!("<svg id=\"Layer_1\" data-name=\"Layer 1\" \
                xmlns=\"http://www.w3.org/2000/svg\" \
                width=\"{0}\" height=\"{1}\" viewBox=\"0 0 {0} {1}\">",
                &self.width, &self.height)
    }
    fn generate_title(&mut self) -> String {
        format!("<title>{}</title>", &self.name)
    }
    fn generate_footer(&mut self) -> String {
        String::from("</svg>")
    }
}

pub fn test_points() {
    let mut path = Path::new();
    path.add_point(30.0, 20.0);
    path.add_point(40.0, -10.0);
    path.translate(0.0, 10.0);
    println!("The path is: {}", path);
    let mut svg_graph = SvgGraph::new("test_plot", 50.0, 49.0);
    svg_graph.add_path(&path);
    let output = svg_graph.compile();
    println!("{}", output);
}

