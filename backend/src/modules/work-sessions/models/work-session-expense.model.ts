import {
  AllowNull,
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  Default,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';
import { WorkSession } from './work-sessions';

@Table({
  tableName: 'work_session_expenses',
  timestamps: true,
  underscored: true,
})
export class WorkSessionExpense extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({
    type: DataType.UUID,
  })
  declare id: string;

  @ForeignKey(() => WorkSession)
  @AllowNull(false)
  @Column({
    type: DataType.UUID,
    field: 'work_session_id',
  })
  declare workSessionId: string;

  @BelongsTo(() => WorkSession, {
    foreignKey: 'workSessionId',
    as: 'workSession',
  })
  declare workSession: WorkSession;

  @AllowNull(false)
  @Column({
    type: DataType.DECIMAL(12, 2),
  })
  declare amount: string;

  @AllowNull(false)
  @Column({
    type: DataType.STRING(120),
  })
  declare description: string;

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
}
