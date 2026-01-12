import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxLength: 100,
    },
    handle: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    
    description: {
      type: String,
      trim: true,
      maxLength: 1000,
    },
    
    image: {
      type: String,
      trim: true,
    },
    shiprocketCollectionId: {
      type: String,
      index: true,
      unique: true,
      sparse: true,
    },
    
    hsn: {
      type: String,
      trim: true,
    },
    
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

categorySchema.index({ name: 'text', description: 'text' });
categorySchema.index({ isActive: 1 });
categorySchema.index({ handle: 1 });

export interface ICategory {
  _id: string;
  name: string;
  handle: string;
  description?: string;
  image?: string;
  shiprocketCollectionId?: string;
  hsn?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export default mongoose.model<ICategory & mongoose.Document>('Category', categorySchema);