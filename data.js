const mongoose = require('mongoose');
const { exec } = require('child_process');

// Connect to your MongoDB database
mongoose.connect('mongodb://127.0.0.1:27017/spotify', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB');
    
    // Define the artist schema and model
    const artistSchema = new mongoose.Schema({
      name: String,
      trackNames: [String],
      popularityScores: [Number],
      artistPopularity: Number // New field to store the artist popularity
    });

    const Artist = mongoose.model('Artist', artistSchema);
    
    // Execute main.py to get the data
    exec('python main.py', (error, stdout, stderr) => {
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
  })
  .catch((error) => {
    console.error('Failed to connect to MongoDB:', error);
  });

// Function to print database information
function printDatabaseInfo(Artist) {
  Artist.find()
    .then((artists) => {
      console.log('All artists in the database:');
      console.log(artists.map((artist) => ({ name: artist.name, artistPopularity: artist.artistPopularity })));
      mongoose.connection.close();
      console.log('MongoDB connection closed');
    })
    .catch((error) => {
      console.error('Failed to fetch artists from the database:', error);
      mongoose.connection.close();
      console.log('MongoDB connection closed');
    });
}