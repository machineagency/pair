use std::fmt;

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

pub fn test_points() {
    let mut path = Path::new();
    path.add_point(30.0, 20.0);
    path.add_point(40.0, -10.0);
    path.translate(0.0, 10.0);
    println!("The path is: {}", path);
    println!("Now let's compile to an SVG tag");
    let tag = path.make_svg_path();
    println!("{}", tag);
}

