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
    pub fn add_point(&mut self, x: f32, y: f32) {
        self.points.push(Point::new(x, y));
    }
    pub fn translate(&mut self, tx: f32, ty: f32) {
        for point in self.points.iter_mut() {
            point.translate(tx, ty);
        }
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
}

