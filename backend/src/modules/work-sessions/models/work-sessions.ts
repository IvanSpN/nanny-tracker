import {
  AllowNull,
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  Default,
  DeletedAt,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';
import { Client } from '../../clients/models/client.model';
import { Worker } from '../../workers/models/worker.model';

export enum WorkSessionRateType {
  REGULAR = 'regular',
  WEEKEND = 'weekend',
}

export enum WorkSessionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  REJECTED = 'rejected',
}

@Table({
  tableName: 'work_sessions',
  timestamps: true,
  paranoid: true,
  underscored: true,
})
export class WorkSession extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({
    type: DataType.UUID,
  })
  declare id: string;

  @ForeignKey(() => Worker)
  @AllowNull(false)
  @Column({
    type: DataType.UUID,
    field: 'worker_id',
  })
  declare workerId: string;

  @BelongsTo(() => Worker, {
    foreignKey: 'workerId',
    as: 'worker',
  })
  declare worker: Worker;

  @ForeignKey(() => Client)
  @AllowNull(false)
  @Column({
    type: DataType.UUID,
    field: 'client_id',
  })
  declare clientId: string;

  @BelongsTo(() => Client, {
    foreignKey: 'clientId',
    as: 'client',
  })
  declare client: Client;

  @AllowNull(false)
  @Column({
    type: DataType.DATEONLY,
    field: 'work_date',
  })
  declare workDate: string;

  @AllowNull(false)
  @Column({
    type: DataType.TIME,
    field: 'start_time',
  })
  declare startTime: string;

  @AllowNull(false)
  @Column({
    type: DataType.TIME,
    field: 'end_time',
  })
  declare endTime: string;

  @AllowNull(false)
  @Column({
    type: DataType.INTEGER,
    field: 'worked_minutes',
  })
  declare workedMinutes: number;

  @AllowNull(false)
  @Column({
    type: DataType.ENUM(...Object.values(WorkSessionRateType)),
    field: 'rate_type',
  })
  declare rateType: WorkSessionRateType;

  @AllowNull(false)
  @Column({
    type: DataType.DECIMAL(12, 2),
    field: 'rate_value',
  })
  declare rateValue: string;

  @AllowNull(false)
  @Column({
    type: DataType.DECIMAL(12, 2),
  })
  declare amount: string;

  @AllowNull(true)
  @Column({
    type: DataType.TEXT,
  })
  declare comment: string | null;

  @AllowNull(false)
  @Default(WorkSessionStatus.PENDING)
  @Column({
    type: DataType.ENUM(...Object.values(WorkSessionStatus)),
  })
  declare status: WorkSessionStatus;

  @AllowNull(true)
  @Column({
    type: DataType.DATE,
    field: 'confirmed_at',
  })
  declare confirmedAt: Date | null;

  @CreatedAt
  @Column({
    type: DataType.DATE,
    field: 'created_at',
  })
  declare createdAt: Date;

  @UpdatedAt
  @Column({
    type: DataType.DATE,
    field: 'updated_at',
  })
  declare updatedAt: Date;

  @DeletedAt
  @Column({
    type: DataType.DATE,
    field: 'deleted_at',
  })
  declare deletedAt: Date | null;
}

export default WorkSession;
