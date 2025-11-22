@switch($entity_type)
    @case('book')
        <i class="svg-icon" data-lucide="book"></i>
        @break

    @case('page')
       <i class="svg-icon" data-lucide="file-text"></i>
       @break

    @case('bookshelf')
        <i class="svg-icon" data-lucide="library-big"></i>
        @break

    @default
        <p>Error: unknown entity type: "{{$entity_type}}"</p>
@endswitch
