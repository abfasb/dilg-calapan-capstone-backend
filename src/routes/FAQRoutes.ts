import express, { Request, Response } from 'express';
import mongoose from 'mongoose';

const router = express.Router();

interface FAQDocument extends mongoose.Document {
  question: string;
  answer: string;
}

const FAQSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true }
});

const FAQ = mongoose.model<FAQDocument>('FAQ', FAQSchema);

router.get('/', async (req: Request, res: Response) => {
  try {
    const faqs = await FAQ.find();
    res.json(faqs);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const newFAQ = new FAQ(req.body);
    const savedFAQ = await newFAQ.save();
    res.status(201).json(savedFAQ);
  } catch (error) {
    res.status(400).json({ message: 'Invalid data' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const updatedFAQ = await FAQ.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updatedFAQ);
  } catch (error) {
    res.status(404).json({ message: 'FAQ not found' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await FAQ.findByIdAndDelete(req.params.id);
    res.json({ message: 'FAQ deleted' });
  } catch (error) {
    res.status(404).json({ message: 'FAQ not found' });
  }
});

export default router;