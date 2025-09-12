import mongoose from "mongoose";

const memberSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  age: { type: Number, required: true },
  documentType: { type: String, required: true },
  documentNumber: { type: String, required: true },
  phoneNumbers: [{ number: String, primary: { type: Boolean, default: false } }],
  speciallyAbled: { type: Boolean, default: false },
  emergencyContact: {
    name: String,
    phone: String,
  },
  relationship: { type: String, required: true },
});

const itinerarySchema = new mongoose.Schema({
  date: { type: Date, required: true },
  location: { type: String, required: true },
  activities: [{ description: String }],
  additionalNotes: { type: String },
});

const tripSchema = new mongoose.Schema({
  tripName: { type: String, required: true },
  destination: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  description: { type: String },
  members: [memberSchema],
  itinerary: [itinerarySchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

const Trip = mongoose.model("Trip", tripSchema);

export default Trip;