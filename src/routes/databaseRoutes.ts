import { Router, Response, Request } from 'express';
import mongoose from 'mongoose';
import Appointment from '../models/Appointment';
import AuditLog from '../models/AutditLogs';
import Notification from '../models/Notification';
import Complaint from '../models/Complaint';
import Conversation from '../models/Conversation';
import Event from '../models/Event';
import GoogleUser from '../models/GoogleUser';
import LGU from '../models/LGUPendingUser';
import LguNotification from '../models/LGUNotification'
import OTP from '../models/OTP';
import ReportForms from '../models/ReportForm';
import ReportReminder from '../models/ReportReminder';
import ResponseCitizen from '../models/ResponseCitizen';
import StatusHistory from '../models/StatusHistory';
import { SystemHistory, Alert } from '../models/SystemHistory';
import User from '../models/User';
import BlogPost from '../models/landingpage/BlogPost';

const router = Router();

router.get('/schema-info', async (req, res) => {
  try {
    const models = [
      { name: 'Appointment', model: Appointment },
      { name: 'BlogPost', model: BlogPost },
      { name: 'AuditLog', model: AuditLog },
      { name: 'Notification', model: Notification },
      { name: 'Complaint', model: Complaint },
      { name: 'Conversation', model: Conversation },
      { name: 'Event', model: Event },
      { name: 'GoogleUser', model: GoogleUser },
      { name: 'LGUnNotification', model: LguNotification },
      { name: 'LGU', model: LGU },
      { name: 'NotificationModel', model: Notification },
      { name: 'OTP', model: OTP },
      { name: 'ReportForms', model: ReportForms },
      { name: 'ReportReminder', model: ReportReminder },
      { name: 'ResponseCitizen', model: ResponseCitizen },
      { name: 'StatusHistory', model: StatusHistory },
      { name: 'SystemHistory', model: SystemHistory },
      { name: 'Alert', model: Alert },
      { name: 'User', model: User }
    ];

    type SchemaField = {
  name: string;
  type: string;
  required: boolean;
  ref: string | null;
};

type SchemaInfo = {
  modelName: string;
  collectionName: string;
  documentCount: number;
  fields: SchemaField[];
  indexes: any[];
  error?: string; 
};

const schemaInfo: SchemaInfo[] = await Promise.all(
  models.map(async (model): Promise<SchemaInfo> => {
    try {
    //@ts-ignore
      const count = await model.model.countDocuments();
      const schemaPaths = model.model.schema.paths;
      const fields: SchemaField[] = Object.keys(schemaPaths).map(key => ({
        name: key,
        type: schemaPaths[key].instance,
        required: schemaPaths[key].isRequired || false,
        ref: schemaPaths[key].options?.ref || null
      }));

      return {
        modelName: model.name,
        collectionName: model.model.collection.name,
        documentCount: count,
        fields,
        indexes: model.model.schema.indexes() || []
      };
    } catch (error: any) {
      return {
        modelName: model.name,
        collectionName: 'unknown',
        documentCount: 0,
        fields: [],
        indexes: [],
        error: error?.message || String(error)
      };
    }
  })
);


    // Define relationships between models
    const relationships = [
      { from: 'Appointment', to: 'User', via: 'user', type: 'one-to-many' },
      { from: 'AuditLog', to: 'User', via: 'userId', type: 'one-to-many' },
      { from: 'Notification', to: 'User', via: 'userId', type: 'one-to-many' },
      { from: 'LguNotification', to: 'User', via: 'userId', type: 'one-to-many' },
      { from: 'ResponseCitizen', to: 'User', via: 'userId', type: 'one-to-many' },
      { from: 'ResponseCitizen', to: 'ReportForms', via: 'formId', type: 'one-to-many' },
      { from: 'StatusHistory', to: 'User', via: 'lguId', type: 'one-to-many' },
      { from: 'StatusHistory', to: 'ReportForms', via: 'formId', type: 'one-to-many' },
      { from: 'ReportReminder', to: 'ReportForms', via: 'formId', type: 'one-to-many' },
      { from: 'Complaint', to: 'User', via: 'userId', type: 'optional' },
      { from: 'Conversation', to: 'User', via: 'userId', type: 'string-reference' }
    ];

      const db = mongoose.connection.db;

        if (!db) {
        throw new Error("MongoDB connection not ready");
        }

        // Now it's safe
        const dbStats = await db.stats();
        const collections = await db.listCollections().toArray();



    res.json({
      success: true,
      schemaInfo,
      relationships,
      databaseStats: {
        dbName: dbStats.db,
        collections: collections.length,
        objects: dbStats.objects,
        dataSize: dbStats.dataSize,
        storageSize: dbStats.storageSize
      },
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
    });
  }
});

//@ts-ignore
router.get('/collection-counts', async (req: Request, res: Response) => {
  try {
    const db = mongoose.connection.db;

    if (!db) {
      return res.status(500).json({
        success: false,
        error: 'MongoDB connection is not established'
      });
    }

    const collections = await db.listCollections().toArray();
    const counts: Record<string, number> = {};

    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      counts[collection.name] = count;
    }

    return res.json({
      success: true,
      counts,
      totalCollections: collections.length
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || String(error)
    });
  }
})


interface Relationship {
  source: string;
  target: string;
  via: string;
  type: string;
  isArray: boolean;
  required: boolean;
  cardinality: string;
}

interface ExplicitRelationship {
  source: string;
  target: string;
  via: string;
  type: string;
}

// ------------ ROUTE 1: RELATIONSHIP ANALYSIS ------------

router.get('/detailed-relationships', async (_req: Request, res: Response) :Promise<void> => {
  try {
    const models = [
      { name: 'Appointment', model: Appointment },
      { name: 'BlogPost', model: BlogPost },
      { name: 'AuditLog', model: AuditLog },
      { name: 'Notification', model: Notification },
      { name: 'Complaint', model: Complaint },
      { name: 'Conversation', model: Conversation },
      { name: 'Event', model: Event },
      { name: 'GoogleUser', model: GoogleUser },
      { name: 'LguNotification', model: LguNotification },
      { name: 'LGU', model: LGU },
      { name: 'OTP', model: OTP },
      { name: 'ReportForms', model: ReportForms },
      { name: 'ReportReminder', model: ReportReminder },
      { name: 'ResponseCitizen', model: ResponseCitizen },
      { name: 'StatusHistory', model: StatusHistory },
      { name: 'SystemHistory', model: SystemHistory },
      { name: 'Alert', model: Alert },
      { name: 'User', model: User }
    ];

    const detailedRelationships: Relationship[] = [];

    for (const { name, model } of models) {
      const schemaPaths = model.schema.paths;

      for (const [fieldName, field] of Object.entries(schemaPaths)) {
        if ((field as any).options?.ref) {
          detailedRelationships.push({
            source: name,
            target: (field as any).options.ref,
            via: fieldName,
            type: (field as any).instance,
            isArray: (field as any).options.type === Array,
            required: (field as any).isRequired ?? false,
            cardinality: (field as any).options.type === Array ? 'one-to-many' : 'one-to-one',
          });
        }
      }

      // virtuals for ResponseCitizen
      if (name === 'ResponseCitizen') {
        detailedRelationships.push(
          {
            source: 'ResponseCitizen',
            target: 'User',
            via: 'userId',
            type: 'ObjectId',
            isArray: false,
            required: true,
            cardinality: 'many-to-one',
          },
          {
            source: 'ResponseCitizen',
            target: 'ReportForms',
            via: 'formId',
            type: 'ObjectId',
            isArray: false,
            required: true,
            cardinality: 'many-to-one',
          }
        );
      }
    }

    const explicitRelationships: ExplicitRelationship[] = [
      { source: 'Appointment', target: 'User', via: 'user', type: 'one-to-many' },
      { source: 'AuditLog', target: 'User', via: 'userId', type: 'one-to-many' },
      { source: 'Notification', target: 'User', via: 'userId', type: 'one-to-many' },
      { source: 'LguNotification', target: 'User', via: 'userId', type: 'one-to-many' },
      { source: 'StatusHistory', target: 'User', via: 'lguId', type: 'one-to-many' },
      { source: 'StatusHistory', target: 'ReportForms', via: 'formId', type: 'one-to-many' },
      { source: 'ReportReminder', target: 'ReportForms', via: 'formId', type: 'one-to-many' },
      { source: 'Complaint', target: 'User', via: 'userId', type: 'optional' },
      { source: 'Conversation', target: 'User', via: 'userId', type: 'string-reference' },
    ];

     res.json({
      success: true,
      relationships: [...detailedRelationships, ...explicitRelationships],
      timestamp: new Date(),
    });

    return;

  } catch (error: any) {
     res.status(500).json({ success: false, error: error.message });
     return;
  }
});

router.get('/schema-enhanced', async (req: Request, res: Response) : Promise<void> => {
  try {
    const db = mongoose.connection.db;

  if (!db) {
       res.status(500).json({
        success: false,
        error: 'Database not connected',
      });
      return;
    }

    const collections = await db
      .listCollections({}, { nameOnly: false })
      .toArray();

    const enhancedSchema = await Promise.all(
      collections.map(async (collection) => {
        const coll = db.collection(collection.name);

        const stats = await (coll as any).stats();
        const indexes = await coll.indexes();

        return {
          name: collection.name,
          type: (collection as any).type || 'collection',
          options: (collection as any).options || {},
          indexes: indexes.map((idx) => ({
            name: idx.name,
            key: idx.key,
            unique: idx.unique || false,
            sparse: idx.sparse || false,
          })),
          stats: {
            count: stats.count,
            size: stats.size,
            storageSize: stats.storageSize,
            totalIndexSize: stats.totalIndexSize,
            avgObjSize: stats.avgObjSize,
          },
        };
      })
    );

     res.json({
      success: true,
      collections: enhancedSchema,
      totalCollections: collections.length,
      timestamp: new Date(),
    });
  } catch (error: any) {
     res.status(500).json({
      success: false,
      error: error.message || 'Unknown error',
    });
  }
});



export default router;