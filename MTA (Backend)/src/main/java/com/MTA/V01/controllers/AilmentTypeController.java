package com.MTA.V01.controllers;

import com.MTA.V01.payload.requests.AddAilmentTypeRequest;
import com.MTA.V01.services.controllers.AilmentTypeServiceWrapper;
import com.MTA.V01.services.general.AilmentTypeServices;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


@RestController
@CrossOrigin(origins = {"https://meditracker.fit","http://meditracker.fit", "smrtnmedi.netlify.app","https://www.meditracker.fit","http://meditracker.fit"}, maxAge = 3600)
@RequestMapping("/api/ailment/type")
public class AilmentTypeController {

    @Autowired
    AilmentTypeServiceWrapper ailmentTypeServiceWrapper;

    @GetMapping("/search/{term}")
    public ResponseEntity<?> searchAilmentTypeByName(@PathVariable("term") String name){
        return ailmentTypeServiceWrapper.searchAilmentTypeByName(name);
    }

    @GetMapping("/getall")
    public ResponseEntity<?> findAllNonProtectedAilments(){
        return ailmentTypeServiceWrapper.findAllNonProtectedAilments();
    }

    @GetMapping("/findbyid/{id}")
    public ResponseEntity<?> findById(@PathVariable("id") Long ailmentTypeId){
        return ailmentTypeServiceWrapper.findAilmentTypeById(ailmentTypeId);
    }

    @PostMapping("/add")
    public ResponseEntity<?> addAilmentType(@Valid @RequestBody AddAilmentTypeRequest addAilmentTypeRequest){
        return ailmentTypeServiceWrapper.addAilmentType(addAilmentTypeRequest);
    }

    @PostMapping("/update/{id}")
    public ResponseEntity<?> updateAilmentType(
            @PathVariable("id") Long ailmentTypeId,
            @Valid @RequestBody AddAilmentTypeRequest addAilmentTypeRequest
    ){
        return ailmentTypeServiceWrapper.updateAilmentType(ailmentTypeId,addAilmentTypeRequest);
    }

    @GetMapping("/self/findall")
    public ResponseEntity<?> findAllPersonal(){
        return ailmentTypeServiceWrapper.findAllPersonalAilmentTypes();
    }
}
