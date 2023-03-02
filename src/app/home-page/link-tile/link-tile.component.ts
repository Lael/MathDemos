import {Component, Input, OnInit} from '@angular/core';

@Component({
  selector: 'link-tile',
  templateUrl: './link-tile.component.html',
  styleUrls: ['./link-tile.component.sass']
})
export class LinkTileComponent implements OnInit {

  @Input('title') title: string = 'Unnamed Demo';
  @Input('path') path: string = '/';
  @Input('image') image: string = '';

  constructor() {
  }

  ngOnInit(): void {
  }

}
