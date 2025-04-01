import ResponseCitizen from '../src/models/ResponseCitizen';
import Complaint from '../src/models/Complaint';
import Appointment from '../src/models/Appointment';

export const calculateSatisfactionScore = async (): Promise<number> => {
  try {
    const [responses, complaints, appointments] = await Promise.all([
      ResponseCitizen.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            successful: {
              $sum: {
                $cond: [{ $eq: ['$status', 'processed'] }, 1, 0]
              }
            }
          }
        }
      ]),
      
      Complaint.aggregate([
        {
          $group: {
            _id: null,
            resolved: {
              $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
            },
            total: { $sum: 1 }
          }
        }
      ]),
      
      Appointment.aggregate([
        {
          $group: {
            _id: null,
            kept: {
              $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
            },
            total: { $sum: 1 }
          }
        }
      ])
    ]);

    const responseScore = responses[0] 
      ? (responses[0].successful / responses[0].total) * 100 
      : 75;
      
    const resolutionScore = complaints[0]
      ? (complaints[0].resolved / complaints[0].total) * 100
      : 80;
      
    const appointmentScore = appointments[0]
      ? (appointments[0].kept / appointments[0].total) * 100
      : 85;

    const satisfactionScore = 
      (resolutionScore * 0.5) +   
      (responseScore * 0.3) +    
      (appointmentScore * 0.2);  

    return Math.min(Math.max(Math.round(satisfactionScore), 100), 0);
    
  } catch (error) {
    console.error('Error calculating satisfaction score:', error);
    return 80;
  }
};