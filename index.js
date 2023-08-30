const express = require('express');
const path = require('path');
const openurl = require('openurl');
const cors = require('cors');
const mongoose = require('mongoose');
const config = require('./config/database');

const app = express();
const port = process.env.PORT || 8080;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

app.use(cors());
// Define the artist schema and model
const artistSchema = new mongoose.Schema({
  name: String,
  monthlyListeners: Number
});

const Artist = mongoose.model('Artist', artistSchema);


exec('python search.py', (error, stdout, stderr) => {
  if (error) {
    console.error('Failed to execute main.py:', error);
    mongoose.connection.close();
    console.log('MongoDB connection closed');
    return;
  }

  // Parse the output from main.py
  const lines = stdout.split('\n');
  const artistName = lines[0].split(':')[1].trim();
  const artistPopularity = parseInt(lines[1].split(':')[1].trim()) || 0;
  const trackLines = lines.slice(2, lines.length - 1);
  
  const trackNames = trackLines.map((line) => {
    const trackName = line.split('-')[0].trim();
    return trackName;
  });

  const popularityScores = trackLines.map((line) => {
    const popularityInfo = line.split(':')[1].trim();
    const popularityScore = parseInt(popularityInfo) || 0;
    return popularityScore;
  });

  // Create the artist document
  const artist = new Artist({
    name: artistName,
    trackNames: trackNames,
    popularityScores: popularityScores,
    artistPopularity: artistPopularity
  });

  // Insert the artist into the database
  artist.save()
    .then(() => {
      console.log('Artist added to the database');
      printDatabaseInfo(Artist);
    })
    .catch((error) => {
      console.error('Failed to insert artist:', error);
      mongoose.connection.close();
      console.log('MongoDB connection closed');
    });
});


// Connect to your MongoDB database
mongoose.connect(config.database, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB');
    
    // Start the server
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to connect to MongoDB:', error);
  });

  app.get('/api/artists', (req, res) => {
    Artist.find({})
      .then(artists => {
        res.json(artists);
      })
      .catch(err => {
        console.error('Failed to retrieve artists:', err);
        res.status(500).json({ error: 'Failed to retrieve artists' });
      });
  });
  
