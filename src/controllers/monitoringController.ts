import { Request, Response } from 'express';
import ResponseCitizen from '../models/ResponseCitizen';
import ReportForms from '../models/ReportForm';
import ReportReminder from '../models/ReportReminder';
import { messaging } from '../config/firebaseConfig';
import User from '../models/User';

interface Barangay {
    id: string,
    name: string
}

    const barangays: Barangay[] = [
        { id: "1", name: "Balingayan" },
        { id: "2", name: "Balite" },
        { id: "3", name: "Baruyan" },
        { id: "4", name: "Batino" },
        { id: "5", name: "Bayanan I" },
        { id: "6", name: "Bayanan II" },
        { id: "7", name: "Biga" },
        { id: "8", name: "Bondoc" },
        { id: "9", name: "Bucayao" },
        { id: "10", name: "Buhuan" },
        { id: "11", name: "Bulusan" },
        { id: "12", name: "Calero" },
        { id: "13", name: "Camansihan" },
        { id: "14", name: "Camilmil" },
        { id: "15", name: "Canubing I" },
        { id: "16", name: "Canubing II" },
        { id: "17", name: "Comunal" },
        { id: "18", name: "Guinobatan" },
        { id: "19", name: "Gulod" },
        { id: "20", name: "Gutad" },
        { id: "21", name: "Ibaba East" },
        { id: "22", name: "Ibaba West" },
        { id: "23", name: "Ilaya" },
        { id: "24", name: "Lalud" },
        { id: "25", name: "Lazareto" },
        { id: "26", name: "Libis" },
        { id: "27", name: "Lumangbayan" },
        { id: "28", name: "Mahal Na Pangalan" },
        { id: "29", name: "Maidlang" },
        { id: "30", name: "Malad" },
        { id: "31", name: "Malamig" },
        { id: "32", name: "Managpi" },
        { id: "33", name: "Masipit" },
        { id: "34", name: "Nag-Iba I" },
        { id: "35", name: "Nag-Iba II" },
        { id: "36", name: "Navotas" },
        { id: "37", name: "Pachoca" },
        { id: "38", name: "Palhi" },
        { id: "39", name: "Panggalaan" },
        { id: "40", name: "Parang" },
        { id: "41", name: "Patas" },
        { id: "42", name: "Personas" },
        { id: "43", name: "Putting Tubig" },
        { id: "44", name: "San Antonio" },
        { id: "45", name: "San Raphael (formerly Salong)" },
        { id: "46", name: "San Vicente Central" },
        { id: "47", name: "San Vicente East" },
        { id: "48", name: "San Vicente North" },
        { id: "49", name: "San Vicente South" },
        { id: "50", name: "San Vicente West" },
        { id: "51", name: "Sapul" },
        { id: "52", name: "Silonay" },
        { id: "53", name: "Sta. Cruz" },
        { id: "54", name: "Sta. Isabel" },
        { id: "55", name: "Sta. Maria Village" },
        { id: "56", name: "Sta. Rita" },
        { id: "57", name: "Sto. Niño (formerly Nacoco)" },
        { id: "58", name: "Suqui" },
        { id: "59", name: "Tawagan" },
        { id: "60", name: "Tawiran" },
        { id: "61", name: "Tibag" },
        { id: "62", name: "Wawa" },
      ];

      export const getMonitoringData = async (req: Request, res: Response): Promise<void> => {
        try {
          const { formId } = req.query;

          if (!formId) {
            res.status(400).json({ message: 'Form ID is required' });
            return;
          }

          // Fetch submissions and populate user data
          const submissions = await ResponseCitizen.find({ formId })
            .populate('userId', 'barangay position')
            .lean();

          const statusMap = new Map();

          barangays.forEach(barangay => {
            statusMap.set(barangay.id, {
              barangayId: barangay.id,
              barangayName: barangay.name,
              positions: {
                'Captain': false,
                'Secretary': false,
                'Treasurer': false,
                'SK Chairman': false,
                'Councilor': false
              },
              submittedCount: 0
            });
          });

          // Create a name-to-ID map for barangays
          const barangayNameToIdMap = new Map<string, string>();
          barangays.forEach(barangay => {
            barangayNameToIdMap.set(barangay.name, barangay.id);
          });

          submissions.forEach(submission => {
            // Try to get barangay and position from submission data first
            let barangayKey: string | null = null;
            let position: string | null = null;
            
            if (submission.data) {
              barangayKey = submission.data.barangay || submission.data.barangayId;
              position = submission.data.position;
            }

            // If not found in submission data, try user data
            if ((!barangayKey || !position) && submission.userId) {
              const user = submission.userId as any;  // Type assertion for populated data
              
              // Get barangay ID from name
              if (user.barangay && barangayNameToIdMap.has(user.barangay)) {
                barangayKey = barangayNameToIdMap.get(user.barangay) as string;
              }
              
              position = user.position;
            }

            if (!barangayKey || !position) return;

            const barangayData = statusMap.get(barangayKey);
            if (barangayData && barangayData.positions[position] !== undefined) {
              barangayData.positions[position] = true;
              barangayData.submittedCount++;
            }
          });

          const monitoringData = Array.from(statusMap.values()).map(barangay => {
            const submittedPositions = Object.values(barangay.positions).filter(Boolean).length;
            const totalPositions = Object.keys(barangay.positions).length;

            let overallStatus: 'low' | 'medium' | 'high' = 'low';
            if (submittedPositions === totalPositions) {
              overallStatus = 'high';
            } else if (submittedPositions >= totalPositions / 2) {
              overallStatus = 'medium';
            }

            return {
              ...barangay,
              overallStatus
            };
          });

          res.json(monitoringData);
        } catch (error) {
          console.error('Error fetching monitoring data:', error);
          res.status(500).json({ message: 'Server error' });
        }
      };


export const sendNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { formId, barangayId, message } = req.body;
    
    const barangay = barangays.find(b => b.id === barangayId);
    if (!barangay) {
      res.status(404).json({ message: 'Barangay not found' });
      return;
    }

    const users = await User.find({ 
      barangay: barangay.name,
      fcmToken: { $exists: true, $ne: '' }
    });

    const newNotification = new ReportReminder({
      formId,
      barangayId,
      message
    });
    await newNotification.save();

    interface UserWithFcmToken {
      _id: string;
      fcmToken: string;
    }

    interface SendPromiseResult {
      success?: boolean;
      error?: any;
    }

    const sendPromises: Promise<SendPromiseResult | null>[] = users.map((user) => {
      return messaging.send({
        token: user.fcmToken as string,
        notification: {
          title: 'Submission Reminder',
          body: message
        },
        data: {
          type: 'submission-reminder',
          formId: formId.toString(),
          barangayId,
          click_action: `${process.env.FRONTEND_URL}/dashboard`
        }
      }).then(() => ({ success: true }))
        .catch(error => {
          console.error(`Failed to send notification to user ${user._id}:`, error);
          return { error };
        });
    });

    await Promise.all(sendPromises);
    
    res.status(201).json({ 
      message: `Notification sent to ${users.length} users in ${barangay.name}` 
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


export const getForms = async (req : Request, res : Response) : Promise<void> => {
  try {
    const forms = await ReportForms.find({}, 'title');
    res.json(forms);
  } catch (error) {
    console.error('Error fetching forms:', error);
    res.status(500).json({ message: 'Server error' });
  }
};