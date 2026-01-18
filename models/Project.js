// models/Project.js
const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  naziv: {
    type: String,
    required: [true, 'Naziv projekta je obavezan'],
    trim: true
  },
  opis: {
    type: String,
    required: [true, 'Opis projekta je obavezan'],
    trim: true
  },
  cijena: {
    type: Number,
    required: [true, 'Cijena projekta je obavezna'],
    min: [0, 'Cijena ne može biti negativna']
  },
  obavljeniPoslovi: [{
    type: String,
    trim: true
  }],
  clanoviTima: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User'
  }],
  datumPocetka: {
    type: Date,
    required: [true, 'Datum početka je obavezan']
  },
  datumZavrsetka: {
    type: Date,
    validate: {
      validator: function(v) {
        if (!v) return true;
        if (!this.datumPocetka) return true;
        // usporedi timestamp-e
        const start = new Date(this.datumPocetka).getTime();
        const end = new Date(v).getTime();
        console.log("VALIDATOR DEBUG: start =", start, "end =", end, "valid =", end >= start);
        return end >= start;
      },
      message: "Datum završetka mora biti nakon datuma početka"
    }
  },  
  status: {
    type: String,
    enum: ['planiran', 'u_tijeku', 'zavrsen', 'otkazan'],
    default: 'planiran'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  arhiviran: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true // Automatski dodaje createdAt i updatedAt
});

// Virtuelno polje za trajanje projekta u danima
projectSchema.virtual('trajanje').get(function() {
  if (this.datumZavrsetka && this.datumPocetka) {
    const diff = this.datumZavrsetka - this.datumPocetka;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
  return null;
});

// Omogući virtualna polja u JSON outputu
projectSchema.set('toJSON', { virtuals: true });
projectSchema.set('toObject', { virtuals: true });

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;