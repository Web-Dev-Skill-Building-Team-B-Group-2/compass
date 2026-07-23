import { Component, OnInit, ChangeDetectionStrategy, input, output, inject, WritableSignal, Signal, signal, computed, Inject, Injector } from '@angular/core';
import { WeeklyGoalsModalAnimations } from './weekly-goals-modal.animations';
import { User } from 'src/app/core/store/user/user.model';
import { AuthStore } from 'src/app/core/store/auth/auth.store';
import { BatchWriteService, BATCH_WRITE_SERVICE } from 'src/app/core/store/batch-write.service';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { NgFor } from '@angular/common';
import { WeeklyGoal } from '../../../../core/store/weekly-goal/weekly-goal.model';
import { QuarterlyGoalData, WeeklyGoalInForm } from '../../home.model';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogClose} from '@angular/material/dialog';
import { FormArray, FormBuilder, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { endOfWeek, startOfWeek } from '../../../../core/utils/time.utils';
import { CdkDragDrop, moveItemInArray, CdkDropList, CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-weekly-goals-modal',
  templateUrl: './weekly-goals-modal.component.html',
  styleUrls: ['./weekly-goals-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: WeeklyGoalsModalAnimations,
  standalone: true,
  imports: [ MatIconModule, MatInputModule, MatSelectModule, MatButtonModule, FormsModule, ReactiveFormsModule, NgFor, CdkDropList, CdkDrag, CdkDragHandle, MatDialogClose,
  ],
})
export class WeeklyGoalsModalComponent implements OnInit {
  readonly authStore = inject(AuthStore);
  // --------------- INPUTS AND OUTPUTS ------------------

  /** The current signed in user. */
  currentUser: Signal<User> = this.authStore.user;

  // --------------- LOCAL UI STATE ----------------------

  /** Loading icon. */
  loading: WritableSignal<boolean> = signal(false);

  weeklyGoalsForm = this.fb.group({
	allGoals: this.fb.array([
	  this.fb.group({
		text: ['', Validators.required],
		originalText: [''],
		originalOrder: [1],
		__weeklyGoalId: [''],
		__quarterlyGoalId: [''],
		_deleted: [false],
		_new: [false],
	  }),
	]),
  });
  // --------------- COMPUTED DATA -----------------------
  endOfWeek = endOfWeek;
  startOfWeek = startOfWeek;

  get allGoals() {
	return this.weeklyGoalsForm.get('allGoals') as FormArray;
  }

  get addedGoalsCount() {
    return this.allGoals.controls.filter(
      (goal) => goal.value._new && !goal.value._deleted
    ).length;
  }

  get editedGoalsCount() {
    return this.allGoals.controls.filter(
      (goal) =>
        goal.dirty &&
        goal.value.text !== goal.value.originalText &&
        !goal.value._new &&
        !goal.value._deleted
    ).length;
  }

  get deletedGoalsCount() {
    return this.allGoals.controls.filter((goal) => goal.value._deleted).length;
  }

  // --------------- EVENT HANDLING ----------------------
  addGoalToForm(goal: WeeklyGoalInForm) {
	if (goal) {
	  this.allGoals.push(
		this.fb.group({
		  text: [goal.text, Validators.required],
		  originalText: [goal.text],
		  originalOrder: [goal.originalOrder],
		  originalQuarterlyGoalId: [goal.__quarterlyGoalId],
		  __weeklyGoalId: [goal.__weeklyGoalId],
		  __quarterlyGoalId: [goal.__quarterlyGoalId, Validators.required],
		  _deleted: [false],
		  _new: [false],
		}),
	  );
	} else {
	  this.allGoals.push(
		this.fb.group({
		  text: ['', Validators.required],
		  __quarterlyGoalId: ['', Validators.required],
		  _deleted: [false],
		  _new: [true],
		}),
	  );
	}
  }

  drop(event: CdkDragDrop<WeeklyGoal[]>) {
	moveItemInArray(
	  this.allGoals.controls,
	  event.previousIndex,
	  event.currentIndex,
	);
  }

  moveItemInFormArray(
	formArray: FormArray,
	fromIndex: number,
	toIndex: number,
  ) {
	const dir = toIndex > fromIndex ? 1 : -1;

	const from = fromIndex;
	const to = toIndex;

	const temp = formArray.at(from);
	for (let i = from; i * dir < to * dir; i = i + dir) {
	  const current = formArray.at(i + dir);
	  formArray.setControl(i, current);
	}
	formArray.setControl(to, temp);
  }

  fullDelete(e, i) {
	if (
	  e.target.checked &&
	  this.weeklyGoalsForm.get(['allGoals', i, '_new']).value
	) {
	  this.allGoals.removeAt(i);
	}
  }

  async saveGoals() {
	await this.data.updateWeeklyGoals(this.allGoals);
  }
  
  // --------------- OTHER -------------------------------

  constructor(
    private injector: Injector,
    @Inject(MAT_DIALOG_DATA)
	public data: {
	  goalDatas: Partial<QuarterlyGoalData>[];
	  incompleteGoals: WeeklyGoal[];
      updateWeeklyGoals: (weeklyGoalsFormArray: FormArray) => void;
	},
    public dialogRef: MatDialogRef<WeeklyGoalsModalComponent>,
	private fb: FormBuilder,
  ) {
    this.allGoals.clear();
    if (this.data.incompleteGoals.length == 0) {
      this.addGoalToForm(null);
    } else {
      this.data.incompleteGoals.forEach((goal) => {
        this.addGoalToForm({
          text: goal.text,
          __quarterlyGoalId: goal.__quarterlyGoalId,
          originalText: goal.text,
          originalOrder: goal.order,
          originalQuarterlyGoalId: goal.__quarterlyGoalId,
          __weeklyGoalId: goal.__id,
          _deleted: goal._deleted,
          _new: false,
        });
      });
    }
  }

  // --------------- LOAD AND CLEANUP --------------------
  
    ngOnInit(): void {}
}