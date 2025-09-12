// Sachet API Proxy (Protected)
export const sachet = async (req, res) => {
  try {
    const response = await fetch("https://nerdrr.gov.in/api/sachet.php");
    const data = await response.json();
    res.json(data);
  } catch (e) {
    console.error("Error fetching sachet:", e);
    res.status(500).json({ error: "Failed to fetch sachet API" });
  }
};

// Landslide API Proxy (Protected)
export const landslide = async (req, res) => {
  try {
    const response = await fetch("https://nerdrr.gov.in/api/landslide_event.php");
    const data = await response.json();
    res.json(data);
  } catch (e) {
    console.error("Error fetching landslide:", e);
    res.status(500).json({ error: "Failed to fetch landslide API" });
  }
};