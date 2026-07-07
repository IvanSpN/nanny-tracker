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
  Unique,
  UpdatedAt,
} from 'sequelize-typescript';
import { User } from '../../users/models/user.model';
import { Worker } from '../../workers/models/worker.model';

@Table({
  tableName: 'clients',
  timestamps: true,
  paranoid: true,
  underscored: true,
})
export class Client extends Model {
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

  @ForeignKey(() => User)
  @Unique
  @AllowNull(false)
  @Column({
    type: DataType.UUID,
    field: 'user_id',
  })
  declare userId: string;

  @BelongsTo(() => User, {
    foreignKey: 'userId',
    as: 'account',
  })
  declare account: User;

  @AllowNull(false)
  @Column({
    type: DataType.STRING,
  })
  declare name: string;

  @AllowNull(false)
  @Column({
    type: DataType.DECIMAL(12, 2),
    field: 'regular_rate',
  })
  declare regularRate: string;

  @AllowNull(true)
  @Column({
    type: DataType.DECIMAL(12, 2),
    field: 'weekend_rate',
  })
  declare weekendRate: string | null;

  @AllowNull(true)
  @Column({
    type: DataType.STRING,
  })
  declare phone: string | null;

  @AllowNull(true)
  @Column({
    type: DataType.TEXT,
  })
  declare notes: string | null;

  @AllowNull(false)
  @Default(true)
  @Column({
    type: DataType.BOOLEAN,
    field: 'is_active',
  })
  declare isActive: boolean;

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
